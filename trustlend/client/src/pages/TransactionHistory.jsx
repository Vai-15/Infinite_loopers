import { useEffect, useMemo, useState } from "react";
import WalletConnectButton from "../components/WalletConnectButton";
import { useWeb3 } from "../context/Web3Context";
import { useTransactionHistory } from "../hooks/useTransactionHistory";
import { ETHERSCAN_TX_BASE } from "../utils/constants";
import { formatDate, formatEth } from "../utils/formatters";

const eventTypes = ["All", "Created", "Funded", "Repaid", "Defaulted"];

export default function TransactionHistory() {
    const { provider, isConnected } = useWeb3();
    const { events, loading, error } = useTransactionHistory();
    const [filter, setFilter] = useState("All");
    const [explorerBase, setExplorerBase] = useState("");

    useEffect(() => {
        let mounted = true;

        async function resolveNetwork() {
            if (!provider) {
                setExplorerBase("");
                return;
            }

            try {
                const network = await provider.getNetwork();
                if (mounted) {
                    setExplorerBase(ETHERSCAN_TX_BASE[network.chainId] || "");
                }
            } catch (error) {
                if (mounted) {
                    setExplorerBase("");
                }
            }
        }

        resolveNetwork();
        return () => {
            mounted = false;
        };
    }, [provider]);

    const visibleEvents = useMemo(() => {
        if (filter === "All") {
            return events;
        }
        return events.filter((event) => event.type === filter);
    }, [events, filter]);

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card/80 p-4">
                <h1 className="text-2xl font-bold text-text">Transaction History</h1>
                {!isConnected && <WalletConnectButton />}
            </div>

            <div className="mb-4 flex justify-end">
                <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-dark px-4 py-2 text-sm text-text"
                >
                    {eventTypes.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </p>
            )}

            <section className="overflow-x-auto rounded-2xl border border-white/10 bg-card/80 p-4">
                <table className="min-w-full text-left text-sm">
                    <thead>
                        <tr className="text-text/70">
                            <th className="py-2">Type</th>
                            <th className="py-2">Loan ID</th>
                            <th className="py-2">Amount</th>
                            <th className="py-2">Date</th>
                            <th className="py-2">Tx Hash</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="py-6 text-center text-text/60">
                                    Loading on-chain events...
                                </td>
                            </tr>
                        ) : visibleEvents.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-6 text-center text-text/60">
                                    No events found for this wallet.
                                </td>
                            </tr>
                        ) : (
                            visibleEvents.map((event) => (
                                <tr key={event.txHash + event.loanId} className="border-t border-white/10 text-text/90">
                                    <td className="py-3">{event.type}</td>
                                    <td className="py-3">#{event.loanId}</td>
                                    <td className="py-3">{formatEth(event.amount)}</td>
                                    <td className="py-3">{formatDate(event.timestamp)}</td>
                                    <td className="py-3">
                                        <a
                                            href={explorerBase ? `${explorerBase}${event.txHash}` : "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary underline"
                                        >
                                            {event.txHash.slice(0, 10)}...
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </main>
    );
}
