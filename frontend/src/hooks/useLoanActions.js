import { useState } from "react";
import { toast } from "react-hot-toast";

import { useWeb3 } from "@/context/Web3Context";
import { api } from "@/services/api";
import { getLoanAgreementContract } from "@/services/blockchain";
import { sanitizeIntegerInput, sanitizeNumericInput, sanitizeText } from "@/utils/security";

function toUsdcUnits(amount) {
  return BigInt(Math.round(Number(sanitizeNumericInput(amount)) * 1e6));
}

function parseLoanRequested(loanFactory, receipt) {
  const iface = loanFactory.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "LoanRequested") {
        return Number(parsed.args.loanId);
      }
    } catch {
      /* continue */
    }
  }
  throw new Error("LoanRequested event not found in receipt");
}

export function useLoanActions() {
  const { signer, loanFactory, escrowVault, mockUSDC, account } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(label, action) {
    setLoading(true);
    setError("");
    const loadingToast = toast.loading(label);
    try {
      const result = await action();
      toast.success("Success", { id: loadingToast });
      return result;
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || "Request failed";
      setError(typeof message === "string" ? message : "Request failed");
      toast.error(typeof message === "string" ? message : "Request failed", { id: loadingToast });
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function createLoan(payload) {
    if (!signer || !loanFactory) throw new Error("Wallet or LoanFactory not configured");

    const amountWei = toUsdcUnits(payload.amount_usdc);
    const interestPct = Number(sanitizeNumericInput(payload.interest_rate));
    const aprBps = Math.round(interestPct * 100);
    const termDays = Number(sanitizeIntegerInput(payload.duration_days));
    const guarantor = payload.guarantor_wallet;
    const did = sanitizeText(payload.borrower_did || `did:polygon:${payload.borrower_wallet}`);
    const borrowerWallet = payload.borrower_wallet.toLowerCase();

    return run("Creating on-chain loan...", async () => {
      const tx = await loanFactory.createLoanRequest(amountWei, aprBps, termDays, guarantor, did);
      const receipt = await tx.wait();
      const loanId = parseLoanRequested(loanFactory, receipt);
      const agreement = await loanFactory.getLoanAgreement(loanId);

      await api.createLoan({
        id: loanId,
        borrower_wallet: borrowerWallet,
        guarantor_wallet: guarantor,
        borrower_did: did,
        contract_address: agreement,
        amount_usdc: Number(sanitizeNumericInput(payload.amount_usdc)),
        interest_rate: interestPct,
        duration_days: termDays,
        purpose: sanitizeText(payload.purpose || "General"),
        borrower_credit_score: payload.borrower_credit_score ?? null
      });

      await api.saveLoanMetadata(loanId, {
        purpose: sanitizeText(payload.purpose || "General"),
        description: sanitizeText(payload.description || ""),
        ipfs_hash: sanitizeText(payload.ipfs_hash || "")
      });

      return { loanId, agreement, receipt };
    });
  }

  async function fundLoan(loanId, lenderWallet) {
    if (!signer || !loanFactory || !mockUSDC || !escrowVault) {
      throw new Error("Contracts not configured — run deploy and node scripts/sync_env.js");
    }

    return run("Funding loan on-chain...", async () => {
      const la = await getLoanAgreementContract(loanFactory, loanId, signer);
      if (!la) throw new Error("Loan agreement not found");
      const principal = await la.principal();
      const stake = (principal * 1000n) / 10000n;
      const vaultAddr = await escrowVault.getAddress();

      const usdcWithSigner = mockUSDC.connect(signer);
      const pTx = await usdcWithSigner.approve(vaultAddr, principal);
      await pTx.wait();

      const fTx = await loanFactory.fundLoan(loanId);
      await fTx.wait();

      const actTx = await la.activateLoan();
      await actTx.wait();

      await api.fundLoan(loanId, { lender_wallet: lenderWallet });
      await api.activateLoan(loanId);

      return true;
    });
  }

  async function repayLoan(loanId, amountUsdc) {
    if (!signer || !loanFactory || !mockUSDC || !escrowVault) {
      throw new Error("Contracts not configured");
    }

    return run("Repaying loan...", async () => {
      const la = await getLoanAgreementContract(loanFactory, loanId, signer);
      if (!la) throw new Error("Loan agreement not found");
      const amountWei = toUsdcUnits(amountUsdc);
      const vaultAddr = await escrowVault.getAddress();
      const usdcWithSigner = mockUSDC.connect(signer);
      const aTx = await usdcWithSigner.approve(vaultAddr, amountWei);
      await aTx.wait();
      const tx = await la.makeRepayment(amountWei);
      const receipt = await tx.wait();
      await api.repayLoan(loanId, {
        amount_usdc: Number(sanitizeNumericInput(amountUsdc)),
        tx_hash: receipt.hash
      });
      return receipt;
    });
  }

  async function declareDefaultOnChain(loanId) {
    if (!signer || !loanFactory) throw new Error("Wallet not ready");
    return run("Declaring default...", async () => {
      const la = await getLoanAgreementContract(loanFactory, loanId, signer);
      if (!la) throw new Error("Loan agreement not found");
      const tx = await la.declareDefault();
      const receipt = await tx.wait();
      await api.markDefault(loanId);
      return receipt;
    });
  }

  async function markDefault(loanId) {
    return api.markDefault(loanId);
  }

  async function saveLoanMetadata(loanId, payload) {
    return run("Saving metadata...", () =>
      api.saveLoanMetadata(loanId, {
        purpose: sanitizeText(payload.purpose),
        description: sanitizeText(payload.description),
        ipfs_hash: sanitizeText(payload.ipfs_hash || "")
      })
    );
  }

  return {
    loading,
    error,
    createLoan,
    fundLoan,
    repayLoan,
    markDefault,
    declareDefaultOnChain,
    saveLoanMetadata,
    account
  };
}

export default useLoanActions;
