import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
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
import LiveStats from "../components/LiveStats";
import SecurityBadge from "../components/SecurityBadge";
import TrustScoreBadge from "../components/TrustScoreBadge";
import {
    fetchDashboardAnalytics,
    fetchRecentEvents,
    fetchTopBorrowers,
    fetchTopLenders,
    fetchVolumeChart
} from "../utils/api";
import { TRUSTLEND_CHART_COLORS, USE_MOCK_DATA } from "../utils/constants";
import { mockAddresses, mockLoans, mockRecentEvents, mockVolume30d } from "../utils/mockData";
import { formatAddress, formatEth } from "../utils/formatters";
import { useWeb3 } from "../context/Web3Context";

function timeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const delta = Math.max(0, now - Number(timestamp || 0));
    if (delta < 60) {
        return `${delta}s ago`;
    }
    if (delta < 3600) {
        return `${Math.floor(delta / 60)}m ago`;
    }
    if (delta < 86400) {
        return `${Math.floor(delta / 3600)}h ago`;
    }
    return `${Math.floor(delta / 86400)}d ago`;
}

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="rounded-xl border border-white/10 bg-dark px-3 py-2 text-xs text-text shadow-lg">
            <p className="mb-1 text-text/80">{label}</p>
            {payload.map((entry) => (
                <p key={entry.name} style={{ color: entry.color }}>
                    {entry.name}: {entry.value}
                </p>
            ))}
        </div>
    );
}

export default function AnalyticsDashboard() {
    const { contract } = useWeb3();
    const [overview, setOverview] = useState({
        totalLoans: 0,
        totalVolume: 0,
        defaultRate: 0,
        avgTrustScore: 0
    });
    const [volumeData, setVolumeData] = useState([]);
    const [statusBreakdown, setStatusBreakdown] = useState([]);
    const [durationBuckets, setDurationBuckets] = useState([]);
    const [trustDistribution, setTrustDistribution] = useState([]);
    const [topLenders, setTopLenders] = useState([]);
    const [topBorrowers, setTopBorrowers] = useState([]);
    const [eventFeed, setEventFeed] = useState([]);
    const [loading, setLoading] = useState(true);

    const pieColors = [
        TRUSTLEND_CHART_COLORS.primary,
        TRUSTLEND_CHART_COLORS.secondary,
        TRUSTLEND_CHART_COLORS.quaternary,
        "#7C3AED"
    ];

    const loadDashboard = useCallback(async () => {
        if (USE_MOCK_DATA) {
            const statusCounts = ["Open", "Funded", "Repaid", "Defaulted"].map((status) => ({
                status,
                count: mockLoans.filter((loan) => loan.status === status).length
            }));

            const duration = ["7d", "14d", "30d", "60d", "90d"].map((bucket) => ({
                bucket,
                count: mockLoans.filter((loan) => `${loan.durationDays}d` === bucket).length
            }));

            const trustBins = [
                { range: "0-20", count: 0 },
                { range: "21-40", count: 0 },
                { range: "41-60", count: 0 },
                { range: "61-80", count: 0 },
                { range: "81-100", count: 0 }
            ];

            mockAddresses.forEach((entry) => {
                const score = entry.trustScore;
                if (score <= 20) trustBins[0].count += 1;
                else if (score <= 40) trustBins[1].count += 1;
                else if (score <= 60) trustBins[2].count += 1;
                else if (score <= 80) trustBins[3].count += 1;
                else trustBins[4].count += 1;
            });

            setOverview({
                totalLoans: mockLoans.length,
                totalVolume: mockLoans.reduce((sum, loan) => sum + loan.amountEth, 0),
                defaultRate: Number(
                    ((mockLoans.filter((loan) => loan.status === "Defaulted").length / mockLoans.length) * 100).toFixed(2)
                ),
                avgTrustScore: Number(
                    (mockAddresses.reduce((sum, entry) => sum + entry.trustScore, 0) / mockAddresses.length).toFixed(2)
                )
            });
            setVolumeData(mockVolume30d);
            setStatusBreakdown(statusCounts);
            setDurationBuckets(duration);
            setTrustDistribution(trustBins);
            setTopBorrowers(
                mockAddresses
                    .map((entry, index) => ({
                        address: entry.address,
                        score: entry.trustScore,
                        repaidLoans: 2 + index,
                        defaultedLoans: index % 2
                    }))
                    .slice(0, 5)
            );
            setTopLenders(
                mockAddresses
                    .map((entry, index) => ({
                        address: entry.address,
                        totalEth: Number((2.5 + index * 1.3).toFixed(2)),
                        activeLoans: 1 + (index % 3),
                        earnedInterest: Number((0.12 + index * 0.08).toFixed(3))
                    }))
                    .slice(0, 5)
            );
            setEventFeed(mockRecentEvents);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [dashboard, volume, lenders, borrowers, recentEvents] = await Promise.all([
                fetchDashboardAnalytics(),
                fetchVolumeChart(30),
                fetchTopLenders(),
                fetchTopBorrowers(),
                fetchRecentEvents(10)
            ]);

            setOverview(dashboard.overview);
            setStatusBreakdown(dashboard.statusBreakdown || []);
            setDurationBuckets(dashboard.durationBuckets || []);
            setTrustDistribution(dashboard.trustDistribution || []);
            setVolumeData(volume.points || []);
            setTopLenders(lenders || []);
            setTopBorrowers(borrowers || []);
            setEventFeed(recentEvents || []);
        } catch (error) {
            console.error("Failed to load analytics dashboard:", error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        if (!contract || USE_MOCK_DATA) {
            const timer = setInterval(loadDashboard, 10000);
            return () => clearInterval(timer);
        }

        const refresh = () => loadDashboard();
        contract.on("LoanCreated", refresh);
        contract.on("LoanFunded", refresh);
        contract.on("LoanRepaid", refresh);
        contract.on("LoanDefaulted", refresh);

        return () => {
            contract.off("LoanCreated", refresh);
            contract.off("LoanFunded", refresh);
            contract.off("LoanRepaid", refresh);
            contract.off("LoanDefaulted", refresh);
        };
    }, [contract, loadDashboard]);

    const statsCards = useMemo(
        () => [
            { title: "Total Loans Created", value: overview.totalLoans },
            { title: "Total ETH Volume", value: `${Number(overview.totalVolume || 0).toFixed(3)} ETH` },
            { title: "Active Default Rate", value: `${Number(overview.defaultRate || 0).toFixed(2)}%` },
            { title: "Average Trust Score", value: Number(overview.avgTrustScore || 0).toFixed(2) }
        ],
        [overview]
    );

    return (
        <main className="mx-auto h-[calc(100vh-72px)] max-w-7xl overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
            <div className="grid h-full grid-cols-12 gap-4">
                <section className="col-span-12 grid gap-3 lg:grid-cols-4">
                    {statsCards.map((stat) => (
                        <article
                            key={stat.title}
                            className="rounded-2xl border border-white/10 bg-card/80 p-4 shadow-lg shadow-black/20"
                        >
                            <p className="text-xs uppercase tracking-wide text-text/60">{stat.title}</p>
                            <p className="mt-2 text-2xl font-black text-text">{stat.value}</p>
                        </article>
                    ))}
                </section>

                <section className="col-span-12 grid gap-4 xl:col-span-9 xl:grid-cols-2">
                    <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
                        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text/70">Daily ETH Volume</h2>
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={volumeData}>
                                    <CartesianGrid stroke={TRUSTLEND_CHART_COLORS.grid} strokeDasharray="3 3" />
                                    <XAxis dataKey="day" tick={{ fill: TRUSTLEND_CHART_COLORS.axis, fontSize: 11 }} />
                                    <YAxis tick={{ fill: TRUSTLEND_CHART_COLORS.axis, fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="volumeEth"
                                        stroke={TRUSTLEND_CHART_COLORS.primary}
                                        fill={TRUSTLEND_CHART_COLORS.primary}
                                        fillOpacity={0.18}
                                        animationDuration={900}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
                        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text/70">Loan Status Mix</h2>
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusBreakdown}
                                        dataKey="count"
                                        nameKey="status"
                                        innerRadius={32}
                                        outerRadius={62}
                                        label
                                        animationDuration={900}
                                    >
                                        {statusBreakdown.map((entry, index) => (
                                            <Cell key={entry.status} fill={pieColors[index % pieColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
                        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text/70">Loan Duration Buckets</h2>
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={durationBuckets}>
                                    <CartesianGrid stroke={TRUSTLEND_CHART_COLORS.grid} strokeDasharray="3 3" />
                                    <XAxis dataKey="bucket" tick={{ fill: TRUSTLEND_CHART_COLORS.axis, fontSize: 11 }} />
                                    <YAxis tick={{ fill: TRUSTLEND_CHART_COLORS.axis, fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar
                                        dataKey="count"
                                        fill={TRUSTLEND_CHART_COLORS.secondary}
                                        radius={[6, 6, 0, 0]}
                                        animationDuration={900}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
                        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text/70">Trust Score Distribution</h2>
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trustDistribution}>
                                    <CartesianGrid stroke={TRUSTLEND_CHART_COLORS.grid} strokeDasharray="3 3" />
                                    <XAxis dataKey="range" tick={{ fill: TRUSTLEND_CHART_COLORS.axis, fontSize: 11 }} />
                                    <YAxis tick={{ fill: TRUSTLEND_CHART_COLORS.axis, fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke={TRUSTLEND_CHART_COLORS.primary}
                                        strokeWidth={2}
                                        animationDuration={900}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </article>
                </section>

                <aside className="col-span-12 space-y-4 xl:col-span-3">
                    <SecurityBadge compact />
                    <LiveStats />
                </aside>

                <section className="col-span-12 grid gap-4 xl:grid-cols-2">
                    <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-text/70">Top 5 Lenders</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-left text-text/60">
                                    <tr>
                                        <th className="py-2">Address</th>
                                        <th className="py-2">ETH Lent</th>
                                        <th className="py-2">Active</th>
                                        <th className="py-2">Interest</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topLenders.map((row) => (
                                        <tr key={row.address} className="border-t border-white/10">
                                            <td className="py-2 text-text/90">{formatAddress(row.address)}</td>
                                            <td className="py-2 text-text/90">{Number(row.totalEth || 0).toFixed(3)}</td>
                                            <td className="py-2 text-text/90">{row.activeLoans || 0}</td>
                                            <td className="py-2 text-text/90">{Number(row.earnedInterest || 0).toFixed(3)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-white/10 bg-card/80 p-4">
                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-text/70">Top 5 Borrowers</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-left text-text/60">
                                    <tr>
                                        <th className="py-2">Address</th>
                                        <th className="py-2">Trust</th>
                                        <th className="py-2">Repaid</th>
                                        <th className="py-2">Defaulted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topBorrowers.map((row) => (
                                        <tr key={row.address} className="border-t border-white/10">
                                            <td className="py-2 text-text/90">{formatAddress(row.address)}</td>
                                            <td className="py-2">
                                                <TrustScoreBadge score={row.score || 0} />
                                            </td>
                                            <td className="py-2 text-text/90">{row.repaidLoans || 0}</td>
                                            <td className="py-2 text-text/90">{row.defaultedLoans || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </article>
                </section>

                <section className="col-span-12 rounded-2xl border border-white/10 bg-card/80 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-text/70">Live Event Feed</h3>
                        {loading && <span className="text-xs text-text/50">Refreshing...</span>}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                        {eventFeed.slice(0, 10).map((event) => (
                            <article key={event.id || event.txHash} className="rounded-xl bg-dark/60 p-3">
                                <p className="text-xs font-semibold text-primary">{event.eventType}</p>
                                <p className="mt-1 text-xs text-text/70">Loan #{event.loanId}</p>
                                <p className="mt-1 text-xs text-text/70">{formatEth(event.amount)}</p>
                                <p className="mt-1 text-xs text-text/70">{formatAddress(event.address)}</p>
                                <p className="mt-1 text-[11px] text-text/50">{timeAgo(event.timestamp)}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
