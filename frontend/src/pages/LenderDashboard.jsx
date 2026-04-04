import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";

import Sidebar from "@/components/Sidebar";
import StatsCard from "@/components/StatsCard";
import { useContract } from "@/hooks/useContract";
import { useLoanActions } from "@/hooks/useLoanActions";
import { useLoans } from "@/hooks/useLoans";
import { formatAddress, formatCurrency, formatDate, formatStatus } from "@/utils/formatters";

const COLORS = ["#E94560", "#14B8A6", "#F59E0B"];

export default function LenderDashboard() {
  const { account } = useContract();
  const filters = useMemo(() => ({ lender_wallet: account || undefined }), [account]);
  const { loans, loading, error, refresh } = useLoans(filters);
  const { markDefault, loading: txLoading, error: txError } = useLoanActions();

  const stats = useMemo(() => {
    const totalLent = loans.reduce((sum, loan) => sum + Number(loan.amount_usdc), 0);
    const activeInvestments = loans.filter((loan) => ["ACTIVE", "REPAYING"].includes(loan.status)).length;
    const earnedInterest = loans
      .filter((loan) => loan.status === "COMPLETED")
      .reduce((sum, loan) => sum + loan.amount_usdc * (loan.interest_rate / 100), 0);

    return {
      totalLent: totalLent.toFixed(2),
      activeInvestments,
      earnedInterest: earnedInterest.toFixed(2)
    };
  }, [loans]);

  const portfolioData = useMemo(
    () => [
      { name: "Active", value: loans.filter((loan) => ["ACTIVE", "REPAYING"].includes(loan.status)).length },
      { name: "Completed", value: loans.filter((loan) => loan.status === "COMPLETED").length },
      { name: "Defaulted", value: loans.filter((loan) => loan.status === "DEFAULTED").length }
    ],
    [loans]
  );

  async function handleMarkDefault(loan) {
    await markDefault(loan.id);
    await refresh();
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row sm:px-6 lg:px-8">
      <Sidebar />

      <div className="flex-1 space-y-4">
        <section className="grid gap-4 md:grid-cols-3">
          <StatsCard title="Total USDC Lent" value={formatCurrency(stats.totalLent)} icon="TL" color="bg-primary/20" />
          <StatsCard title="Active Investments" value={stats.activeInvestments} icon="AI" color="bg-emerald-500/20" />
          <StatsCard
            title="Earned Interest"
            value={formatCurrency(stats.earnedInterest)}
            icon="IN"
            color="bg-yellow-500/20"
          />
        </section>

        {(error || txError) && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error || txError}
          </p>
        )}

        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-card/80 p-4">
          <h2 className="mb-3 text-lg font-semibold text-text">My Funded Loans</h2>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-text/70">
                <th className="py-2">Loan ID</th>
                <th className="py-2">Borrower</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Interest</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-text/60">
                    Loading investments...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-text/60">
                    No funded loans yet.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="border-t border-white/10 text-text/90">
                    <td className="py-3">#{loan.id}</td>
                    <td className="py-3">{formatAddress(loan.borrower_wallet)}</td>
                    <td className="py-3">{formatCurrency(loan.amount_usdc)}</td>
                    <td className="py-3">{loan.interest_rate}%</td>
                    <td className={`py-3 ${formatStatus(loan.status).color}`}>{formatStatus(loan.status).label}</td>
                    <td className="py-3">{formatDate(loan.created_at)}</td>
                    <td className="py-3">
                      {loan.status === "ACTIVE" || loan.status === "REPAYING" ? (
                        <button
                          type="button"
                          onClick={() => handleMarkDefault(loan)}
                          disabled={txLoading}
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Mark Default
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

        <section className="rounded-2xl border border-white/10 bg-card/80 p-5">
          <h3 className="mb-3 text-lg font-semibold text-text">Portfolio Mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={portfolioData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {portfolioData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  );
}
