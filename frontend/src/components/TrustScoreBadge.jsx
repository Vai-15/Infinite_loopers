function tone(score) {
  if (score < 550) {
    return "bg-red-500/15 text-red-300 border-red-400/30";
  }
  if (score < 700) {
    return "bg-yellow-500/15 text-yellow-300 border-yellow-400/30";
  }
  return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
}

export default function TrustScoreBadge({ score = 0 }) {
  const normalized = Math.max(300, Math.min(850, Number(score) || 300));
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone(normalized)}`}>
      Credit: {normalized}
    </span>
  );
}
