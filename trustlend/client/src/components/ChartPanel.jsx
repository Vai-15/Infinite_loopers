export default function ChartPanel({ title, children }) {
    return (
        <section className="rounded-2xl border border-white/10 bg-card/80 p-5 shadow-lg shadow-black/20">
            <h3 className="mb-4 text-lg font-semibold text-text">{title}</h3>
            <div className="h-64">{children}</div>
        </section>
    );
}
