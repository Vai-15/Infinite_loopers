export default function SecurityBadge({ compact = false }) {
    const checks = [
        "ReentrancyGuard Active",
        "Rate Limiting ON",
        "Input Validated",
        "CORS Enforced"
    ];

    return (
        <section
            className={`rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 shadow-lg shadow-black/20 ${
                compact ? "max-w-sm" : "w-full"
            }`}
        >
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-200">
                Security Layer
            </h3>
            <ul className="space-y-2">
                {checks.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-emerald-100">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/30 text-xs">
                            ✓
                        </span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
