export default function StatsCard({ title, value, icon, color = "bg-accent/30" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/80 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-text/70">{title}</p>
        <span className={`rounded-lg px-2 py-1 text-xs text-text ${color}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
    </div>
  );
}
