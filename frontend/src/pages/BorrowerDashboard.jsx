import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

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
  const filters = useMemo(() => ({ borrower_wallet: account }), [account]);
  const { loans, loading, error, refresh } = useLoans(filters, null, !account);
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

    await createLoan({
      ...payload,
      borrower_wallet: account,
      borrower_credit_score: score,
      borrower_did: `did:polygon:${account}`
    });
    setIsModalOpen(false);
    await refresh();
  }

  async function handleRepay(loan) {
    const totalDue = loan.amount_usdc * (1 + Number(loan.interest_rate || 0) / 100);
    await repayLoan(loan.id, totalDue);
    await refresh();
  }

  const ficoScore = creditResult?.score ?? 300;
  const gauge1000 = Math.round(Math.min(1000, Math.max(0, ((ficoScore - 300) / 550) * 1000)));
  const radialData = [{ name: "health", value: gauge1000, fill: "#e94560" }];

  const reputationTrend = useMemo(() => {
    const s = ficoScore;
    return [0, 1, 2, 3, 4, 5].map((i) => ({
      label: `+${i + 1}m`,
      score: Math.round(Math.min(850, Math.max(300, s - 45 + i * 12)))
    }));
  }, [ficoScore]);

  const upcomingRepayments = useMemo(() => {
    return loans
      .filter((l) => l.status === "ACTIVE" || l.status === "REPAYING")
      .map((l) => {
        const start = l.created_at ? new Date(l.created_at) : new Date();
        const due = new Date(start.getTime() + Number(l.duration_days || 0) * 86400000);
        return {
          id: l.id,
          due,
          amount_usdc: l.amount_usdc,
          status: l.status
        };
      })
      .sort((a, b) => a.due - b.due)
      .slice(0, 8);
  }, [loans]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row sm:px-6 lg:px-8">
      <Sidebar />

      <div className="flex-1 space-y-4">
        <section className="rounded-2xl border border-white/10 bg-card/80 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-44 w-full max-w-[220px] sm:shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="100%"
                    barSize={14}
                    data={radialData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <PolarAngleAxis type="number" domain={[0, 1000]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-sm text-text/70">Credit health (0–1000 scale)</p>
                <p className="text-4xl font-black text-emerald-300">{gauge1000}</p>
                <p className="text-sm text-text/60">
                  FICO-style score: <span className="text-text">{ficoScore}</span>
                </p>
              </div>
            </div>
            <div className="min-h-[160px] flex-1">
              <p className="mb-2 text-sm font-semibold text-text/80">Reputation trend (estimated)</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={reputationTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis domain={[300, 850]} tick={{ fontSize: 11 }} stroke="#94a3b8" width={36} />
                  <Tooltip
                    contentStyle={{ background: "#16213e", border: "1px solid rgba(255,255,255,0.1)" }}
                    labelStyle={{ color: "#eaeaea" }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white lg:self-center"
            >
              Request New Loan
            </button>
          </div>
        </section>

        {upcomingRepayments.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-card/80 p-4">
            <h2 className="mb-3 text-lg font-semibold text-text">Repayment outlook</h2>
            <p className="mb-3 text-xs text-text/60">Estimated maturity from loan start + term (single bullet repayment).</p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {upcomingRepayments.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-dark/40 px-3 py-2"
                >
                  <span className="font-mono text-text/90">#{row.id}</span>
                  <span className="text-text/70">{formatDate(row.due.toISOString())}</span>
                  <span className="text-emerald-300/90">{formatCurrency(row.amount_usdc)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
