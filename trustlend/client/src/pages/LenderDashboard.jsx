import { useMemo, useState } from "react";
import { ethers } from "ethers";
import {
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import Sidebar from "../components/Sidebar";
import StatsCard from "../components/StatsCard";
import { useLoanAction } from "../hooks/useLoanAction";
import { useMyLoans } from "../hooks/useMyLoans";
import { formatAddress, formatDate, formatEth, formatStatus } from "../utils/formatters";

const COLORS = ["#E94560", "#14B8A6", "#F59E0B"];

export default function LenderDashboard() {
    const { loans, loading, error, refresh } = useMyLoans("lender");
    const { markDefault, loading: txLoading, error: txError } = useLoanAction();
    const [defaultingId, setDefaultingId] = useState(null);

    const stats = useMemo(() => {
        const totalEthLent = loans.reduce(
            (sum, loan) => sum + Number(ethers.utils.formatEther(loan.amount)),
            0
        );
        const activeInvestments = loans.filter((loan) => loan.status === 1).length;
        const earnedInterest = loans
            .filter((loan) => loan.status === 2)
            .reduce(
                (sum, loan) =>
                    sum + Number(ethers.utils.formatEther(loan.amount.mul(loan.interestRate).div(100))),
                0
            );

        return {
            totalEthLent: totalEthLent.toFixed(2),
            activeInvestments,
            earnedInterest: earnedInterest.toFixed(3)
        };
    }, [loans]);

    const portfolioData = useMemo(
        () => [
            { name: "Active", value: loans.filter((loan) => loan.status === 1).length },
            { name: "Repaid", value: loans.filter((loan) => loan.status === 2).length },
            { name: "Defaulted", value: loans.filter((loan) => loan.status === 3).length }
        ],
        [loans]
    );

    const returnsData = useMemo(
        () =>
            loans
                .filter((loan) => loan.status === 2)
                .map((loan) => ({
                    name: `Loan ${loan.id}`,
                    interest: Number(ethers.utils.formatEther(loan.amount.mul(loan.interestRate).div(100)))
                })),
        [loans]
    );

    async function handleMarkDefault(loan) {
        try {
            setDefaultingId(loan.id);
            await markDefault(loan.id);
            await refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setDefaultingId(null);
        }
    }

    function canMarkDefault(loan) {
        if (loan.status !== 1 || !loan.startTime) {
            return false;
        }

        const dueAt = loan.startTime + loan.duration;
        const now = Math.floor(Date.now() / 1000);
        return now > dueAt;
    }

    return (
        <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row sm:px-6 lg:px-8">
            <Sidebar />

            <div className="flex-1 space-y-4">
                <section className="grid gap-4 md:grid-cols-3">
                    <StatsCard title="Total ETH Lent" value={`${stats.totalEthLent} ETH`} icon="TL" color="bg-primary/20" />
                    <StatsCard
                        title="Active Investments"
                        value={stats.activeInvestments}
                        icon="AI"
                        color="bg-emerald-500/20"
                    />
                    <StatsCard
                        title="Earned Interest"
                        value={`${stats.earnedInterest} ETH`}
                        icon="IN"
                        color="bg-yellow-500/20"
                    />
                </section>

                {(error || txError) && (
                    <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error || txError}
                    </p>
                )}

                <section className="overflow-x-auto rounded-2xl border border-white/10 bg-card/80 p-4">
                    <h2 className="mb-3 text-lg font-semibold text-text">My Funded Loans</h2>
                    <table className="min-w-full text-left text-sm">
                        <thead>
                            <tr className="text-text/70">
                                <th className="py-2">Loan ID</th>
                                <th className="py-2">Borrower</th>
                                <th className="py-2">Amount</th>
                                <th className="py-2">Interest</th>
                                <th className="py-2">Status</th>
                                <th className="py-2">Repayment Date</th>
                                <th className="py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-6 text-center text-text/60">
                                        Loading investments...
                                    </td>
                                </tr>
                            ) : loans.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-6 text-center text-text/60">
                                        No funded loans yet.
                                    </td>
                                </tr>
                            ) : (
                                loans.map((loan) => (
                                    <tr key={loan.id} className="border-t border-white/10 text-text/90">
                                        <td className="py-3">#{loan.id}</td>
                                        <td className="py-3">{formatAddress(loan.borrower)}</td>
                                        <td className="py-3">{formatEth(loan.amount)}</td>
                                        <td className="py-3">{loan.interestRate}%</td>
                                        <td className={`py-3 ${formatStatus(loan.status).color}`}>
                                            {formatStatus(loan.status).label}
                                        </td>
                                        <td className="py-3">{formatDate(loan.startTime + loan.duration)}</td>
                                        <td className="py-3">
                                            {canMarkDefault(loan) ? (
                                                <button
                                                    onClick={() => handleMarkDefault(loan)}
                                                    disabled={defaultingId === loan.id || txLoading}
                                                    className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                                >
                                                    {defaultingId === loan.id && txLoading ? "Marking..." : "Mark Default"}
                                                </button>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                    <article className="rounded-2xl border border-white/10 bg-card/80 p-5">
                        <h3 className="mb-3 text-lg font-semibold text-text">Portfolio Mix</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={portfolioData} dataKey="value" nameKey="name" outerRadius={90} label>
                                        {portfolioData.map((entry, index) => (
                                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-white/10 bg-card/80 p-5">
                        <h3 className="mb-3 text-lg font-semibold text-text">Returns Over Time</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={returnsData}>
                                    <XAxis dataKey="name" stroke="#BFC6D1" />
                                    <YAxis stroke="#BFC6D1" />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="interest" stroke="#E94560" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </article>
                </section>
            </div>
        </main>
    );
}
