function getBadgeClasses(score) {
    if (score <= 33) {
        return "bg-red-500/15 text-red-300 border-red-400/30";
    }
    if (score <= 66) {
        return "bg-yellow-500/15 text-yellow-300 border-yellow-400/30";
    }
    return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
}

export default function TrustScoreBadge({ score }) {
    const normalized = Math.max(0, Math.min(100, Number(score) || 0));

    return (
        <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClasses(
                normalized
            )}`}
        >
            Trust Score: {normalized}
        </span>
    );
}
