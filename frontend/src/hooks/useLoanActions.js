import { useState } from "react";
import { toast } from "react-hot-toast";

import { api } from "@/services/api";
import { sanitizeIntegerInput, sanitizeNumericInput, sanitizeText } from "@/utils/security";

export function useLoanActions() {
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
      setError(message);
      toast.error(message, { id: loadingToast });
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function createLoan(payload) {
    const amount = Number(sanitizeNumericInput(payload.amount_usdc));
    const interestRate = Number(sanitizeNumericInput(payload.interest_rate));
    const durationDays = Number(sanitizeIntegerInput(payload.duration_days));

    return run("Creating loan...", () =>
      api.createLoan({
        borrower_wallet: payload.borrower_wallet,
        amount_usdc: amount,
        interest_rate: interestRate,
        duration_days: durationDays,
        purpose: sanitizeText(payload.purpose || "General"),
        borrower_credit_score: payload.borrower_credit_score ?? null
      })
    );
  }

  async function fundLoan(loanId, lenderWallet) {
    return run("Funding loan...", () => api.fundLoan(loanId, { lender_wallet: lenderWallet }));
  }

  async function repayLoan(loanId, amountUsdc) {
    const amount = Number(sanitizeNumericInput(amountUsdc));
    return run("Submitting repayment...", () => api.repayLoan(loanId, { amount_usdc: amount }));
  }

  async function markDefault(loanId) {
    return run("Marking default...", () => api.markDefault(loanId));
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
    saveLoanMetadata
  };
}

export default useLoanActions;
