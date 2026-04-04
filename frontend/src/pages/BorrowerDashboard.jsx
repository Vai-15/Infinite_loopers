import { useMemo, useState } from "react";

import LoanRequestModal from "@/components/LoanRequestModal";
import Sidebar from "@/components/Sidebar";
import StatsCard from "@/components/StatsCard";
import { useContract } from "@/hooks/useContract";
import { useCredit } from "@/hooks/useCredit";
import { useLoanActions } from "@/hooks/useLoanActions";
import { useLoans } from "@/hooks/useLoans";
import { formatCurrency, formatDate, formatStatus } from "@/utils/formatters";

export default function BorrowerDashboard() {
  const { account } = useContract();
  const filters = useMemo(() => ({ borrower_wallet: account || undefined }), [account]);
  const { loans, loading, error, refresh } = useLoans(filters);
  const { data: creditResult, scoreWallet } = useCredit();
  const { createLoan, repayLoan, loading: txLoading, error: txError } = useLoanActions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleCreateLoan(payload) {
    let score = creditResult?.score ?? null;

    if (account && score == null) {
      const result = await scoreWallet(account, {
        wallet_age_days: 365,
        num_transactions: 50,
        avg_tx_value_usd: 100,
        num_previous_loans: loans.length,
        repayment_rate: 0.8,
        default_count: 0,
        community_vouches: 2,
        monthly_income_usd: 2500,
        days_employed: 720
      });
      score = result.score;
    }

    await createLoan({ ...payload, borrower_wallet: account, borrower_credit_score: score });
    setIsModalOpen(false);
    await refresh();
  }

  async function handleRepay(loan) {
    await repayLoan(loan.id, loan.amount_usdc);
    await refresh();
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row sm:px-6 lg:px-8">
      <Sidebar />

      <div className="flex-1 space-y-4">
        <section className="rounded-2xl border border-white/10 bg-card/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-text/70">My Latest Credit Score</p>
              <p className="text-4xl font-black text-emerald-300">{creditResult?.score ?? "--"}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Request New Loan
            </button>
          </div>
        </section>

        {(error || txError) && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error || txError}
          </p>
        )}

        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-card/80 p-4">
          <h2 className="mb-3 text-lg font-semibold text-text">My Loans</h2>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-text/70">
                <th className="py-2">Loan ID</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Rate</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-text/60">
                    Loading loans...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-text/60">
                    No loans yet.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="border-t border-white/10 text-text/90">
                    <td className="py-3">#{loan.id}</td>
                    <td className="py-3">{formatCurrency(loan.amount_usdc)}</td>
                    <td className="py-3">{loan.interest_rate}%</td>
                    <td className={`py-3 ${formatStatus(loan.status).color}`}>{formatStatus(loan.status).label}</td>
                    <td className="py-3">{formatDate(loan.created_at)}</td>
                    <td className="py-3">
                      {loan.status === "ACTIVE" || loan.status === "REPAYING" ? (
                        <button
                          type="button"
                          onClick={() => handleRepay(loan)}
                          disabled={txLoading}
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Repay
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <StatsCard title="Total Loans" value={loans.length} icon="LN" color="bg-accent/60" />
      </div>

      <LoanRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateLoan}
        loading={txLoading}
      />
    </main>
  );
}
