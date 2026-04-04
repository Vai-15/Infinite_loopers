import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

/** Deterministic PRNG (mulberry32) for reproducible demo data */
function createSeededRandom(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHART_ANIMATION = { isAnimationActive: true, animationDuration: 1200, animationBegin: 0 };

function StatCard({ label, value, sub, accent }) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-card/90 dark:shadow-black/30 ${accent || ""}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-text/55">{label}</p>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-slate-900 dark:text-text">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500 dark:text-text/50">{sub}</p>}
    </article>
  );
}

const tooltipContentStyle = {
  background: "rgba(22, 33, 62, 0.95)",
  border: "1px solid rgba(233, 69, 96, 0.35)",
  borderRadius: "12px",
  color: "#eaeaea",
  fontSize: "12px"
};

const axisTick = { fill: "currentColor", fontSize: 11 };
const gridStroke = "rgba(148, 163, 184, 0.25)";

function HeatmapCell({ value, label }) {
  const pct = Math.round(value * 100);
  const hue = Math.max(0, 120 - value * 120);
  const bg = `hsla(${hue}, 70%, ${value > 0.35 ? 38 : 45}%, ${0.35 + value * 0.45})`;
  return (
    <div
      className="flex aspect-square min-h-[44px] items-center justify-center rounded-lg border border-white/10 text-[10px] font-bold text-white shadow-inner transition hover:scale-105 hover:ring-2 hover:ring-primary/60 sm:text-xs"
      style={{ background: bg }}
      title={label}
    >
      {pct}%
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const data = useMemo(() => {
    const rand = createSeededRandom(20260404);

    const volume30 = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const base = 12000 + rand() * 8000;
      const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.65 : 1;
      volume30.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        volume: Math.round(base * weekend * (0.85 + rand() * 0.3))
      });
    }

    const creditBands = [
      { band: "300–450", count: Math.round(8 + rand() * 14) },
      { band: "450–600", count: Math.round(18 + rand() * 22) },
      { band: "600–750", count: Math.round(28 + rand() * 25) },
      { band: "750–850", count: Math.round(12 + rand() * 16) }
    ];

    const statusPie = [
      { name: "Active", value: Math.round(42 + rand() * 18), color: "#38bdf8" },
      { name: "Completed", value: Math.round(55 + rand() * 25), color: "#34d399" },
      { name: "Defaulted", value: Math.round(4 + rand() * 8), color: "#f87171" },
      { name: "Pending", value: Math.round(15 + rand() * 12), color: "#fbbf24" }
    ];

    const returnsRisk = [];
    for (let w = 0; w < 12; w++) {
      returnsRisk.push({
        week: `W${w + 1}`,
        lowRisk: Number((3.2 + rand() * 1.8 + w * 0.08).toFixed(2)),
        medRisk: Number((5.5 + rand() * 2.5 + w * 0.12).toFixed(2)),
        highRisk: Number((9 + rand() * 4 + w * 0.18).toFixed(2))
      });
    }

    const amountBuckets = ["$0–2k", "$2–5k", "$5–10k", "$10–25k", "$25k+"];
    const scoreBuckets = ["300–420", "420–540", "540–660", "660–780", "780+"];

    const heatmap = [];
    for (let a = 0; a < 5; a++) {
      const row = [];
      for (let s = 0; s < 5; s++) {
        const amtFactor = 0.15 + a * 0.12;
        const scoreFactor = Math.max(0.05, 0.55 - s * 0.1);
        const noise = rand() * 0.12;
        const p = Math.min(0.92, Math.max(0.02, amtFactor * scoreFactor + noise));
        row.push({
          p,
          label: `${amountBuckets[a]} × ${scoreBuckets[s]}: ${Math.round(p * 100)}% est. default`
        });
      }
      heatmap.push(row);
    }

    const types = ["loan", "repayment", "default"];
    const txFeed = Array.from({ length: 10 }, (_, i) => {
      const type = types[Math.floor(rand() * 3)];
      const hash = `0x${Array.from({ length: 8 }, () => Math.floor(rand() * 16).toString(16)).join("")}…${Array.from({ length: 4 }, () => Math.floor(rand() * 16).toString(16)).join("")}`;
      return {
        id: i,
        txHash: hash,
        amount: Math.round(500 + rand() * 45000),
        type,
        ago: `${Math.floor(rand() * 59) + 1}m ago`
      };
    });

    const tvl = Math.round(890000 + rand() * 420000);
    const totalLoans = 184 + Math.floor(rand() * 80);
    const avgCredit = Math.round(612 + rand() * 95);
    const defaultRate = Number((2.1 + rand() * 2.8).toFixed(2));

    return {
      volume30,
      creditBands,
      statusPie,
      returnsRisk,
      heatmap,
      amountBuckets,
      scoreBuckets,
      txFeed,
      tvl,
      totalLoans,
      avgCredit,
      defaultRate
    };
  }, []);

  const formatUsdc = (n) =>
    `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC`;

  if (!mounted) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex h-40 items-center justify-center text-slate-500 dark:text-text/50">
          <span className="animate-pulse text-sm font-semibold">Loading analytics…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="analytics-dashboard mx-auto max-w-[1600px] px-4 py-8 pb-16 sm:px-6 lg:px-8">
      <header className="mb-10 text-center sm:text-left">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Protocol intelligence</p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-slate-900 dark:text-text sm:text-4xl">
          Analytics Command Center
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-text/65">
          DecentraLend market depth, credit cohorts, and risk surfaces — demo data seeded for reproducible screenshots.
        </p>
      </header>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Value Locked" value={formatUsdc(data.tvl)} sub="USDC in active vaults" />
        <StatCard label="Total Loans Issued" value={data.totalLoans.toLocaleString()} sub="All-time originated" />
        <StatCard label="Average Credit Score" value={data.avgCredit} sub="FICO-style composite" />
        <StatCard
          label="Default Rate"
          value={`${data.defaultRate}%`}
          sub="Rolling 90d estimate"
          accent="ring-1 ring-primary/20"
        />
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-xl shadow-slate-200/30 dark:border-white/10 dark:bg-card/95 dark:shadow-black/40">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-text/80">
                Loan volume
              </h2>
              <p className="text-xs text-slate-500 dark:text-text/55">Last 30 days · daily USDC</p>
            </div>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">Live demo</span>
          </div>
          <div className="h-[280px] w-full text-slate-600 dark:text-text/70">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.volume30} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e94560" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#e94560" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  formatter={(v) => [formatUsdc(v), "Volume"]}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#e94560"
                  strokeWidth={3}
                  dot={{ fill: "#e94560", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                  {...CHART_ANIMATION}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-xl shadow-slate-200/30 dark:border-white/10 dark:bg-card/95 dark:shadow-black/40">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-text/80">
              Loans by credit band
            </h2>
            <p className="text-xs text-slate-500 dark:text-text/55">Distribution across score ranges</p>
          </div>
          <div className="h-[280px] w-full text-slate-600 dark:text-text/70">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.creditBands} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="band" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Bar dataKey="count" radius={[10, 10, 4, 4]} {...CHART_ANIMATION}>
                  {data.creditBands.map((_, i) => (
                    <Cell key={i} fill={["#0f3460", "#335c81", "#14b8a6", "#e94560"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-xl shadow-slate-200/30 dark:border-white/10 dark:bg-card/95 dark:shadow-black/40">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-text/80">
              Loan status mix
            </h2>
            <p className="text-xs text-slate-500 dark:text-text/55">Active · Completed · Defaulted · Pending</p>
          </div>
          <div className="h-[280px] w-full text-slate-600 dark:text-text/70">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  {...CHART_ANIMATION}
                >
                  {data.statusPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipContentStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-xl shadow-slate-200/30 dark:border-white/10 dark:bg-card/95 dark:shadow-black/40">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-text/80">
              Lender returns vs risk
            </h2>
            <p className="text-xs text-slate-500 dark:text-text/55">Annualized yield % by risk tier (12 wks)</p>
          </div>
          <div className="h-[280px] w-full text-slate-600 dark:text-text/70">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.returnsRisk} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gMed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="lowRisk"
                  name="Low risk"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#gLow)"
                  {...CHART_ANIMATION}
                />
                <Area
                  type="monotone"
                  dataKey="medRisk"
                  name="Medium risk"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  fill="url(#gMed)"
                  {...CHART_ANIMATION}
                />
                <Area
                  type="monotone"
                  dataKey="highRisk"
                  name="High risk"
                  stroke="#f87171"
                  strokeWidth={2}
                  fill="url(#gHigh)"
                  {...CHART_ANIMATION}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mb-10 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <article className="h-full rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-xl dark:border-white/10 dark:from-card dark:via-card dark:to-accent/30 dark:shadow-black/40">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-text/80">
                  Live transactions
                </h2>
                <p className="text-xs text-slate-500 dark:text-text/55">Last 10 on-chain events (demo)</p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Streaming
              </span>
            </div>
            <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
              {data.txFeed.map((tx) => (
                <li
                  key={tx.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-dark/50"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-slate-800 dark:text-text/90">{tx.txHash}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-text/50">{tx.ago}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-text">{formatUsdc(tx.amount)}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                        tx.type === "loan"
                          ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                          : tx.type === "repayment"
                            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                            : "bg-rose-500/20 text-rose-800 dark:text-rose-200"
                      }`}
                    >
                      {tx.type}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="lg:col-span-2">
          <article className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-xl dark:border-white/10 dark:bg-card/95 dark:shadow-black/40">
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-text/80">
                Default risk heatmap
              </h2>
              <p className="text-xs text-slate-500 dark:text-text/55">Estimated default % by size × credit</p>
            </div>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid" style={{ gridTemplateColumns: "88px repeat(5, minmax(0, 1fr))" }}>
                  <div />
                  {data.scoreBuckets.map((h) => (
                    <div
                      key={h}
                      className="mb-1 px-0.5 text-center text-[9px] font-bold uppercase leading-tight text-slate-500 dark:text-text/55 sm:text-[10px]"
                    >
                      {h}
                    </div>
                  ))}
                  {data.heatmap.map((row, ri) => (
                    <div key={ri} className="contents">
                      <div className="flex items-center pr-2 text-[9px] font-bold text-slate-600 dark:text-text/65 sm:text-[10px]">
                        {data.amountBuckets[ri]}
                      </div>
                      {row.map((cell, ci) => (
                        <div key={ci} className="p-0.5">
                          <HeatmapCell value={cell.p} label={cell.label} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 dark:text-text/50">
              <span>Lower risk</span>
              <div className="mx-2 h-2 flex-1 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600" />
              <span>Higher risk</span>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
