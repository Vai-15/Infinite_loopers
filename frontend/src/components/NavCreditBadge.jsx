import { useCredit } from "@/hooks/useCredit";

export default function NavCreditBadge() {
  const { data, loading } = useCredit();

  if (loading && !data) {
    return (
      <span className="hidden rounded-full border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/15 dark:text-text/80 sm:inline-block">
        Credit · …
      </span>
    );
  }

  if (data?.score == null) {
    return null;
  }

  return (
    <span className="hidden rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 sm:inline-block">
      Credit · {data.score}
    </span>
  );
}
