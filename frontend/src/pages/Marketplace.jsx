import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import LoanCard from "@/components/LoanCard";
import { useContract } from "@/hooks/useContract";
import { useLoanActions } from "@/hooks/useLoanActions";
import { useLoans } from "@/hooks/useLoans";

const sortOptions = [
  { value: "amount", label: "Amount" },
  { value: "duration", label: "Duration" },
  { value: "interest", label: "Interest" }
];

export default function Marketplace() {
  const { account, isConnected } = useContract();
  const { openConnectModal } = useConnectModal();
  const filters = useMemo(() => ({ status: "PENDING", marketplace: true }), []);
  const { loans, loading, error, refresh } = useLoans(filters, 10000);
  const { fundLoan, loading: txLoading, error: txError } = useLoanActions();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("amount");
  const [fundingLoanId, setFundingLoanId] = useState(null);

  const filteredLoans = useMemo(() => {
    const bySearch = loans.filter((loan) => loan.borrower_wallet.toLowerCase().includes(search.toLowerCase()));
    return bySearch.sort((a, b) => {
      if (sortBy === "duration") {
        return b.duration_days - a.duration_days;
      }
      if (sortBy === "interest") {
        return b.interest_rate - a.interest_rate;
      }
      return b.amount_usdc - a.amount_usdc;
    });
  }, [loans, search, sortBy]);

  async function handleFundLoan(loan) {
    if (!isConnected) {
      openConnectModal?.();
      toast("Connect a wallet to fund a loan");
      return;
    }

    if (account && account.toLowerCase() === loan.borrower_wallet.toLowerCase()) {
      return;
    }

    try {
      setFundingLoanId(loan.id);
      await fundLoan(loan.id, account);
      await refresh();
    } finally {
      setFundingLoanId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-text">Loan Marketplace</h1>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search borrower address"
          className="rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Sort by {option.label}
            </option>
          ))}
        </select>
        <div className="rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text/70">
          Loans Available: {filteredLoans.length}
        </div>
      </div>

      {(error || txError) && (
        <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || txError}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-2xl border border-white/10 bg-card/60" />
          ))}
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-dark/50 p-12 text-center">
          <h3 className="text-xl font-semibold text-text">No open loans found</h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredLoans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onFund={handleFundLoan}
              funding={txLoading && fundingLoanId === loan.id}
              disabled={!isConnected}
            />
          ))}
        </div>
      )}
    </main>
  );
}
