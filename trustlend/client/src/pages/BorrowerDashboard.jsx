import { useMemo, useState } from "react";
import { ethers } from "ethers";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import LoanRequestModal from "../components/LoanRequestModal";
import Sidebar from "../components/Sidebar";
import StatsCard from "../components/StatsCard";
import { useLoanAction } from "../hooks/useLoanAction";
import { useMyLoans } from "../hooks/useMyLoans";
import { useTrustScore } from "../hooks/useTrustScore";
import { useWeb3 } from "../context/Web3Context";
import { formatAddress, formatDaysLeft, formatEth, formatStatus } from "../utils/formatters";

export default function BorrowerDashboard() {
    const { account } = useWeb3();
    const { loans, loading, error, refresh } = useMyLoans("borrower");
    const { score: trustScore, color: trustTone } = useTrustScore(account);
    const { createLoan, repayLoan, loading: txLoading, error: txError } = useLoanAction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [repayingId, setRepayingId] = useState(null);

    const chartData = useMemo(
        () =>
            [...loans]
                .sort((a, b) => a.id - b.id)
                .map((loan) => ({
                    name: `Loan ${loan.id}`,
                    amount: Number(ethers.utils.formatEther(loan.amount))
                })),
        [loans]
    );

    async function handleCreateLoan(formData) {
        try {
            setIsSubmitting(true);
            await createLoan(formData.amount, formData.durationDays, formData.interestRate);
            setIsModalOpen(false);
            await refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRepay(loan) {
        try {
            setRepayingId(loan.id);
            const due = loan.amount.add(loan.amount.mul(loan.interestRate).div(100));
            await repayLoan(loan.id, due);
            await refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setRepayingId(null);
        }
    }

    return (
        <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row sm:px-6 lg:px-8">
            <Sidebar />

            <div className="flex-1 space-y-4">
                <section className="rounded-2xl border border-white/10 bg-card/80 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-text/70">My Trust Score</p>
                            <p className={`text-4xl font-black ${trustTone}`}>{trustScore}</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                        >
                            Request New Loan
                        </button>
                    </div>
                </section>

                {(error || txError) && (
                    <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error || txError}
                    </p>
                )}

                <section className="overflow-x-auto rounded-2xl border border-white/10 bg-card/80 p-4">
                    <h2 className="mb-3 text-lg font-semibold text-text">My Active Loans</h2>
                    <table className="min-w-full text-left text-sm">
                        <thead>
                            <tr className="text-text/70">
                                <th className="py-2">Loan ID</th>
                                <th className="py-2">Amount</th>
                                <th className="py-2">Lender</th>
                                <th className="py-2">Status</th>
                                <th className="py-2">Days Remaining</th>
                                <th className="py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-6 text-center text-text/60">
                                        Loading loans...
                                    </td>
                                </tr>
                            ) : loans.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-6 text-center text-text/60">
                                        No loans yet.
                                    </td>
                                </tr>
                            ) : (
                                loans.map((loan) => (
                                    <tr key={loan.id} className="border-t border-white/10 text-text/90">
                                        <td className="py-3">#{loan.id}</td>
                                        <td className="py-3">{formatEth(loan.amount)}</td>
                                        <td className="py-3">{formatAddress(loan.lender)}</td>
                                        <td className={`py-3 ${formatStatus(loan.status).color}`}>
                                            {formatStatus(loan.status).label}
                                        </td>
                                        <td className="py-3">{formatDaysLeft(loan.startTime, loan.duration)}</td>
                                        <td className="py-3">
                                            {loan.status === 1 ? (
                                                <button
                                                    onClick={() => handleRepay(loan)}
                                                    disabled={repayingId === loan.id || txLoading}
                                                    className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                                >
                                                    {repayingId === loan.id && txLoading ? "Repaying..." : "Repay"}
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

                <StatsCard title="Total Loans" value={loans.length} icon="LN" color="bg-accent/60" />

                <section className="rounded-2xl border border-white/10 bg-card/80 p-5">
                    <h3 className="mb-4 text-lg font-semibold text-text">Loan History Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#243B58" />
                                <XAxis dataKey="name" stroke="#BFC6D1" />
                                <YAxis stroke="#BFC6D1" />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#E94560"
                                    fill="#E94560"
                                    fillOpacity={0.2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            <LoanRequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateLoan}
                loading={isSubmitting || txLoading}
            />
        </main>
    );
}
