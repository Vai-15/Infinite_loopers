import { useNavigate } from "react-router-dom";

import SecurityBadge from "@/components/SecurityBadge";
import StatsCard from "@/components/StatsCard";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ROUTES } from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

export default function Landing() {
  const navigate = useNavigate();
  const { overview } = useAnalytics();

  const stats = [
    { title: "Total Loans", value: overview?.totalLoans ?? 0 },
    { title: "Total Volume", value: formatCurrency(overview?.totalVolume || 0) },
    { title: "Default Rate", value: `${overview?.defaultRate || 0}%` },
    { title: "Avg Credit", value: overview?.avgTrustScore || 0 }
  ];

  return (
    <main className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <section className="relative mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <p className="mb-4 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Decentralized Lending Protocol
          </p>
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-black leading-tight text-text sm:text-6xl">
            <span className="gradient-headline">Lend. Borrow. Trust. No Banks.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text/75">
            DecentraLend combines blockchain escrow, AI credit scoring, and community trust to make fair credit accessible.
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.marketplace)}
            className="mt-8 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Explore Marketplace
          </button>
        </div>

        <div className="mb-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <StatsCard key={stat.title} title={stat.title} value={stat.value} icon={`0${index + 1}`} color="bg-primary/20" />
          ))}
        </div>

        <section className="rounded-3xl border border-white/10 bg-card/70 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <h2 className="mb-6 text-2xl font-bold text-text">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Request", "Borrowers submit amount, duration, and purpose with AI risk scoring."],
              ["Fund", "Lenders review trust indicators and fund opportunities transparently."],
              ["Repay", "Repayments are tracked, defaults penalized, and reputation updated."]
            ].map(([title, description]) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-dark/70 p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
                  {title.slice(0, 1)}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text">{title}</h3>
                <p className="text-sm text-text/70">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <SecurityBadge compact />
        </div>
      </section>
    </main>
  );
}
