function color(score) {
  if (score < 550) {
    return "bg-red-500/20 text-red-200";
  }
  if (score < 700) {
    return "bg-yellow-500/20 text-yellow-100";
  }
  return "bg-emerald-500/20 text-emerald-100";
}

export default function CreditGauge({ score = 300 }) {
  const risk = score >= 720 ? "LOW" : score >= 580 ? "MEDIUM" : "HIGH";

  return (
    <article className="rounded-lg border border-white/10 bg-card/80 p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-text">Credit Score</h3>
      <p className="mt-2 text-3xl font-bold text-text">{score}</p>
      <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${color(score)}`}>
        {risk}
      </span>
    </article>
  );
}
