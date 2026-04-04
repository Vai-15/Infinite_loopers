import { useNavigate } from "react-router-dom";
import WalletConnectButton from "../components/WalletConnectButton";
import StatsCard from "../components/StatsCard";
import { LANDING_STATS } from "../utils/constants";

const steps = [
    {
        title: "Request",
        description: "Borrowers define amount, duration, and rate. Smart contracts lock rules from day one."
    },
    {
        title: "Fund",
        description: "Lenders review risk in one glance and fund directly to borrowers without intermediaries."
    },
    {
        title: "Repay",
        description: "Repayments and defaults are enforced on-chain, building transparent trust history."
    }
];

export default function Landing() {
    const navigate = useNavigate();

    return (
        <main className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 lg:px-8">
            <div className="grid-animated pointer-events-none absolute inset-0 opacity-40" />

            <section className="relative mx-auto max-w-7xl">
                <div className="mb-14 text-center">
                    <p className="mb-4 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        Decentralized Lending Protocol
                    </p>
                    <h1 className="mx-auto max-w-4xl text-balance text-4xl font-black leading-tight text-text sm:text-6xl">
                        <span className="gradient-headline">Lend. Borrow. Trust. No Banks.</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-text/75">
                        TrustLend turns peer-to-peer credit into programmable finance. Transparent rates,
                        trust-native lending, and instant settlement on-chain.
                    </p>
                    <div className="mt-8 flex justify-center">
                        <WalletConnectButton navigateTo="/marketplace" />
                    </div>
                </div>

                <div className="mb-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {LANDING_STATS.map((stat, index) => (
                        <StatsCard
                            key={stat.title}
                            title={stat.title}
                            value={stat.value}
                            icon={`0${index + 1}`}
                            color="bg-primary/20"
                        />
                    ))}
                </div>

                <section className="rounded-3xl border border-white/10 bg-card/70 p-6 shadow-2xl shadow-black/30 sm:p-8">
                    <h2 className="mb-6 text-2xl font-bold text-text">How It Works</h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        {steps.map((step) => (
                            <article
                                key={step.title}
                                className="rounded-2xl border border-white/10 bg-dark/70 p-5 transition hover:border-primary/40"
                            >
                                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
                                    {step.title.slice(0, 1)}
                                </div>
                                <h3 className="mb-2 text-lg font-semibold text-text">{step.title}</h3>
                                <p className="text-sm text-text/70">{step.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center">
                    <h3 className="text-2xl font-bold text-text">Ready to enter the marketplace?</h3>
                    <p className="mx-auto mt-2 max-w-2xl text-sm text-text/70">
                        Connect your wallet and start lending or borrowing with transparent on-chain trust.
                    </p>
                    <button
                        onClick={() => navigate("/marketplace")}
                        className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
                    >
                        Explore Marketplace
                    </button>
                </section>
            </section>
        </main>
    );
}
