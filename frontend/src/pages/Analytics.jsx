import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import LiveStats from "@/components/LiveStats";
import SecurityBadge from "@/components/SecurityBadge";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatAddress, formatCurrency } from "@/utils/formatters";

const PIE_COLORS = ["#E94560", "#0F3460", "#335C81", "#14B8A6"];

export default function Analytics() {
  const { dashboard, volume, topBorrowers, topLenders, events, loading, error } = useAnalytics();

  const overview = dashboard?.overview || {
    totalLoans: 0,
    totalVolume: 0,
    defaultRate: 0,
    avgTrustScore: 0
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-4 grid gap-4 md:grid-cols-4">
        {[
          ["Total Loans", overview.totalLoans],
          ["Total Volume", formatCurrency(overview.totalVolume)],
          ["Default Rate", `${overview.defaultRate}%`],
          ["Average Credit", overview.avgTrustScore]
        ].map(([title, value]) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-card/80 p-4">
            <p className="text-xs uppercase tracking-wide text-text/60">{title}</p>
            <p className="mt-2 text-2xl font-black text-text">{value}</p>
          </article>
        ))}
      </section>

      {error && (
        <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text/70">Daily Volume</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volume}>
                <CartesianGrid stroke="#243B58" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: "#BFC6D1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#BFC6D1", fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="volumeEth" stroke="#E94560" fill="#E94560" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text/70">Status Mix</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard?.statusBreakdown || []} dataKey="count" nameKey="status" outerRadius={80} label>
                  {(dashboard?.statusBreakdown || []).map((item, idx) => (
                    <Cell key={`${item.status}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text/70">Duration Buckets</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.durationBuckets || []}>
                <CartesianGrid stroke="#243B58" strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fill: "#BFC6D1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#BFC6D1", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0F3460" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text/70">Trust Distribution</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.trustDistribution || []}>
                <CartesianGrid stroke="#243B58" strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fill: "#BFC6D1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#BFC6D1", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#14B8A6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-text/70">Top Borrowers</h3>
          <div className="space-y-2">
            {topBorrowers.map((row) => (
              <div key={row.address} className="flex items-center justify-between rounded-lg bg-dark/60 p-3">
                <span className="text-sm text-text">{formatAddress(row.address)}</span>
                <TrustScoreBadge score={row.score || 300} />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-text/70">Top Lenders</h3>
          <div className="space-y-2">
            {topLenders.map((row) => (
              <div key={row.address} className="flex items-center justify-between rounded-lg bg-dark/60 p-3">
                <span className="text-sm text-text">{formatAddress(row.address)}</span>
                <span className="text-sm font-semibold text-text">{formatCurrency(row.totalEth)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-card/80 p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-text/70">Live Event Feed</h3>
            {loading && <span className="text-xs text-text/50">Refreshing...</span>}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {events.map((event) => (
              <article key={event.id || event.txHash} className="rounded-xl bg-dark/60 p-3">
                <p className="text-xs font-semibold text-primary">{event.eventType}</p>
                <p className="mt-1 text-xs text-text/70">Loan #{event.loanId}</p>
                <p className="mt-1 text-xs text-text/70">{formatCurrency(event.amount)}</p>
                <p className="mt-1 text-xs text-text/70">{formatAddress(event.address)}</p>
              </article>
            ))}
          </div>
        </article>
        <aside className="space-y-4">
          <SecurityBadge compact />
          <LiveStats />
        </aside>
      </section>
    </main>
  );
}
