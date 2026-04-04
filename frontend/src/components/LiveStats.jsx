import { useMemo } from "react";

import { useAnalytics } from "@/hooks/useAnalytics";
import { useContract } from "@/hooks/useContract";
import { formatCurrency } from "@/utils/formatters";

export default function LiveStats() {
  const { overview, events } = useAnalytics();
  const { txCount, chainId } = useContract();

  const recentTypes = useMemo(() => {
    return (events || []).slice(0, 4).map((event) => event.eventType);
  }, [events]);

  return (
    <section className="rounded-2xl border border-white/10 bg-card/80 p-4 shadow-lg shadow-black/20">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-text/70">Live Stats</h3>
      <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-xl bg-dark/60 p-3">
          <p className="text-text/60">Total Loan Volume</p>
          <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(overview?.totalVolume || 0)}</p>
        </div>
        <div className="rounded-xl bg-dark/60 p-3">
          <p className="text-text/60">Wallet Tx Count</p>
          <p className="mt-1 text-lg font-bold text-text">{txCount}</p>
        </div>
        <div className="rounded-xl bg-dark/60 p-3">
          <p className="text-text/60">Connected Chain</p>
          <p className="mt-1 text-lg font-bold text-emerald-300">{chainId || "N/A"}</p>
        </div>
        <div className="rounded-xl bg-dark/60 p-3">
          <p className="text-text/60">Recent Events</p>
          <p className="mt-1 text-xs font-semibold text-text">{recentTypes.join(" • ") || "No events yet"}</p>
        </div>
      </div>
    </section>
  );
}
