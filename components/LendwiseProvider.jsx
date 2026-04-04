"use client";

/**
 * Lendwise AI — global Context + localStorage persistence.
 * Loans are shared across tabs/refreshes; addresses normalized to lowercase for matching.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  LOANS_KEY,
  loadLoansFromStorage,
  loadRoleForWallet,
  normalizeAddr,
  normalizeLoan,
  saveLoansToStorage,
  saveRoleForWallet
} from "@/lib/loanPersistence";
import { BADGE_LABEL, STATUS, nextId } from "@/lib/workflow";
import {
  AMOY_EXPLORER,
  connectMetaMask,
  hasBrowserWallet,
  sendNativePol,
  validateAddress
} from "@/lib/web3";

const LendwiseContext = createContext(null);

export function useLendwise() {
  const ctx = useContext(LendwiseContext);
  if (!ctx) throw new Error("useLendwise outside provider");
  return ctx;
}

const POLL_MS = 2500;

export function LendwiseProvider({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [loanRequests, setLoanRequests] = useState([]);
  const [transactionStatus, setTransactionStatus] = useState({ idle: true });
  const [notifications, setNotifications] = useState([]);
  const [lastTxHash, setLastTxHash] = useState("");
  const [error, setError] = useState("");
  const [fundsModal, setFundsModal] = useState({ open: false, loanId: null });
  const [sessionChecked, setSessionChecked] = useState(false);
  /** After true, loanWrites trigger localStorage saves (avoids wiping store on first paint). */
  const [loansHydrated, setLoansHydrated] = useState(false);

  const pushNote = useCallback((message, type = "info") => {
    const id = nextId();
    setNotifications((n) => [...n, { id, message, type }]);
    setTimeout(() => {
      setNotifications((n) => n.filter((x) => x.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Step: hydrate loans from localStorage once the app is on the client */
  useEffect(() => {
    if (!mounted) return;
    setLoanRequests(loadLoansFromStorage());
    setLoansHydrated(true);
  }, [mounted]);

  /** Step: persist every loan list change after hydration */
  useEffect(() => {
    if (!mounted || !loansHydrated) return;
    saveLoansToStorage(loanRequests);
  }, [mounted, loansHydrated, loanRequests]);

  /** Step: other tabs update localStorage → pull; polling catches same-machine multi-tab edge cases */
  useEffect(() => {
    if (!mounted || !loansHydrated) return;

    const pull = () => {
      const incoming = loadLoansFromStorage();
      setLoanRequests((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(incoming)) return prev;
        return incoming;
      });
    };

    const onStorage = (e) => {
      if (e.key === null || e.key === LOANS_KEY) pull();
    };

    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(pull, POLL_MS);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, [mounted, loansHydrated]);

  /** Step: restore last role for this wallet (or clear when switching accounts) */
  useEffect(() => {
    if (!sessionChecked || !walletAddress) return;
    const saved = loadRoleForWallet(walletAddress);
    setUserRole(saved || null);
  }, [walletAddress, sessionChecked]);

  /** Step: persist role when user picks one */
  useEffect(() => {
    if (walletAddress && userRole) saveRoleForWallet(walletAddress, userRole);
  }, [walletAddress, userRole]);

  useEffect(() => {
    if (!mounted) return;

    if (!hasBrowserWallet()) {
      setWalletAddress("");
      setSessionChecked(true);
      return;
    }

    const eth = window.ethereum;
    let cancelled = false;

    (async () => {
      try {
        const accts = await eth.request({ method: "eth_accounts" });
        if (!cancelled && accts?.[0]) setWalletAddress(normalizeAddr(accts[0]));
        else if (!cancelled) setWalletAddress("");
      } catch {
        if (!cancelled) setWalletAddress("");
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    const onAccounts = (a) => setWalletAddress(a?.[0] ? normalizeAddr(a[0]) : "");
    const onChain = () => setError("");
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      cancelled = true;
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, [mounted]);

  const connectWallet = useCallback(async () => {
    setError("");
    try {
      const addr = await connectMetaMask();
      setWalletAddress(normalizeAddr(addr));
      pushNote("Wallet connected", "success");
      router.push("/dashboard");
    } catch (e) {
      const msg = e?.code === 4001 ? "Connection rejected." : e?.message || "Connect failed";
      setError(msg);
      pushNote(msg, "error");
    }
  }, [pushNote, router]);

  const disconnect = useCallback(() => {
    setWalletAddress("");
    setUserRole(null);
    setError("");
    router.push("/");
  }, [router]);

  const selectRole = useCallback(
    (role) => {
      setUserRole(role);
      if (walletAddress) saveRoleForWallet(walletAddress, role);
      pushNote(`Role: ${role}`, "success");
    },
    [walletAddress, pushNote]
  );

  /** Step: borrower creates request — stored globally for lender wallet */
  const requestLoan = useCallback(
    ({ amount, purpose, lenderAddress }) => {
      setError("");
      const lender = validateAddress(lenderAddress);
      if (!lender.ok) {
        setError(lender.error);
        return;
      }
      if (!amount || Number(amount) <= 0) {
        setError("Invalid loan amount.");
        return;
      }
      if (!purpose?.trim()) {
        setError("Purpose required.");
        return;
      }
      const id = nextId();
      const row = normalizeLoan({
        id,
        borrower: normalizeAddr(walletAddress),
        lender: normalizeAddr(lender.address),
        amount: String(amount),
        purpose: purpose.trim(),
        status: STATUS.PENDING,
        documentsNote: "",
        guarantor: "",
        guarantorAccepted: false,
        fundTxHash: "",
        fundsCollected: false
      });
      setLoanRequests((r) => [...r, row]);
      pushNote("Request sent", "success");
    },
    [walletAddress, pushNote]
  );

  const lenderReviewRequest = useCallback(
    (loanId) => {
      const me = normalizeAddr(walletAddress);
      setLoanRequests((rows) => {
        const loan = rows.find((l) => l.id === loanId);
        if (!loan || loan.lender !== me) return rows;
        return rows.map((l) => (l.id === loanId ? { ...l, status: STATUS.UNDER_REVIEW } : l));
      });
      pushNote("Document + guarantor request sent to borrower", "info");
    },
    [walletAddress, pushNote]
  );

  const borrowerSubmitGuarantorFlow = useCallback(
    (loanId, { documentsNote, guarantorWallet }) => {
      setError("");
      const g = validateAddress(guarantorWallet);
      if (!g.ok) {
        setError(g.error);
        return;
      }
      if (!documentsNote?.trim()) {
        setError("Upload or describe documents.");
        return;
      }
      const me = normalizeAddr(walletAddress);
      setLoanRequests((rows) =>
        rows.map((l) =>
          l.id === loanId && l.borrower === me
            ? {
                ...l,
                status: STATUS.AWAITING_GUARANTOR,
                documentsNote: documentsNote.trim(),
                guarantor: normalizeAddr(g.address)
              }
            : l
        )
      );
      pushNote("Request sent to guarantor", "success");
    },
    [walletAddress, pushNote]
  );

  const guarantorAccept = useCallback(
    (loanId) => {
      const me = normalizeAddr(walletAddress);
      setLoanRequests((rows) =>
        rows.map((l) =>
          l.id === loanId && l.guarantor === me
            ? { ...l, status: STATUS.GUARANTEED, guarantorAccepted: true }
            : l
        )
      );
      pushNote("Guarantor approved", "success");
    },
    [walletAddress, pushNote]
  );

  const guarantorReject = useCallback(
    (loanId) => {
      const me = normalizeAddr(walletAddress);
      setLoanRequests((rows) =>
        rows.map((l) =>
          l.id === loanId && l.guarantor === me
            ? { ...l, status: STATUS.REJECTED_GUARANTOR, guarantorAccepted: false }
            : l
        )
      );
      pushNote("Guarantee rejected", "error");
    },
    [walletAddress, pushNote]
  );

  const borrowerFinalSubmit = useCallback(
    (loanId) => {
      const me = normalizeAddr(walletAddress);
      setLoanRequests((rows) =>
        rows.map((l) =>
          l.id === loanId && l.borrower === me && l.status === STATUS.GUARANTEED
            ? { ...l, status: STATUS.FINAL_REVIEW }
            : l
        )
      );
      pushNote("Final application sent to lender", "success");
    },
    [walletAddress, pushNote]
  );

  const lenderApproveAndFund = useCallback(
    async (loanId) => {
      setError("");
      const me = normalizeAddr(walletAddress);
      const loan = loanRequests.find((l) => l.id === loanId && l.lender === me);
      if (!loan || loan.status !== STATUS.FINAL_REVIEW) return;

      setTransactionStatus({ idle: false, label: "Confirm in MetaMask…" });
      try {
        const hash = await sendNativePol({
          from: walletAddress,
          to: loan.borrower,
          amountPol: loan.amount
        });
        setLastTxHash(hash);
        setLoanRequests((rows) =>
          rows.map((l) =>
            l.id === loanId ? { ...l, status: STATUS.FUNDED, fundTxHash: hash } : l
          )
        );
        pushNote("Funds received on borrower wallet (on-chain)", "success");
        setFundsModal({ open: true, loanId });
        setTransactionStatus({ idle: true });
      } catch (e) {
        const msg =
          e?.code === 4001 ? "Transaction rejected." : e?.message || "Transaction failed";
        setError(msg);
        pushNote(msg, "error");
        setTransactionStatus({ idle: true });
      }
    },
    [loanRequests, walletAddress, pushNote]
  );

  const borrowerCollectFunds = useCallback((loanId) => {
    const me = normalizeAddr(walletAddress);
    setLoanRequests((rows) =>
      rows.map((l) =>
        l.id === loanId && l.borrower === me
          ? { ...l, status: STATUS.COLLECTED, fundsCollected: true }
          : l
      )
    );
    setFundsModal({ open: false, loanId: null });
    pushNote("Funds collected to personal workflow (simulated)", "success");
  }, [walletAddress, pushNote]);

  const badgeFor = useCallback((status) => BADGE_LABEL[status] || status, []);

  const value = useMemo(
    () => ({
      mounted,
      sessionChecked,
      loansHydrated,
      hasMM: mounted && hasBrowserWallet(),
      walletAddress,
      userRole,
      loanRequests,
      transactionStatus,
      notifications,
      lastTxHash,
      error,
      fundsModal,
      setFundsModal,
      connectWallet,
      disconnect,
      selectRole,
      requestLoan,
      lenderReviewRequest,
      borrowerSubmitGuarantorFlow,
      guarantorAccept,
      guarantorReject,
      borrowerFinalSubmit,
      lenderApproveAndFund,
      borrowerCollectFunds,
      badgeFor,
      setError,
      AMOY_EXPLORER
    }),
    [
      mounted,
      sessionChecked,
      loansHydrated,
      walletAddress,
      userRole,
      loanRequests,
      transactionStatus,
      notifications,
      lastTxHash,
      error,
      fundsModal,
      connectWallet,
      disconnect,
      selectRole,
      requestLoan,
      lenderReviewRequest,
      borrowerSubmitGuarantorFlow,
      guarantorAccept,
      guarantorReject,
      borrowerFinalSubmit,
      lenderApproveAndFund,
      borrowerCollectFunds,
      badgeFor
    ]
  );

  return <LendwiseContext.Provider value={value}>{children}</LendwiseContext.Provider>;
}
