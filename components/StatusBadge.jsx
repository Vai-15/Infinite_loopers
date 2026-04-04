"use client";

const styles = {
  Pending: "bg-amber-500/20 text-amber-200 ring-amber-500/30",
  "Under Review": "bg-sky-500/20 text-sky-200 ring-sky-500/30",
  Guaranteed: "bg-violet-500/20 text-violet-200 ring-violet-500/30",
  Approved: "bg-emerald-500/20 text-emerald-200 ring-emerald-500/30",
  Funded: "bg-teal-500/20 text-teal-100 ring-teal-500/40"
};

export default function StatusBadge({ label }) {
  const c = styles[label] || "bg-slate-600/40 text-slate-200 ring-slate-500/30";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${c}`}>
      {label}
    </span>
  );
}
