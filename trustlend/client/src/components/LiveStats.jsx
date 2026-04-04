import { ethers } from "ethers";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAnalytics, fetchRecentEvents } from "../utils/api";

function CountUp({ value, suffix = "" }) {
    const [display, setDisplay] = useState(0);
    const previousRef = useRef(0);

    useEffect(() => {
        let frame;
        const duration = 900;
        const start = performance.now();
        const initial = previousRef.current;

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const next = initial + (value - initial) * progress;
            setDisplay(next);
            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            } else {
                previousRef.current = value;
            }
        }

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value]);

    return <span>{display.toFixed(2)}{suffix}</span>;
}

function mapNetworkLabel(chainId) {
    if (chainId === 31337) {
        return "Localhost";
    }
    if (chainId === 11155111) {
        return "Sepolia";
    }
    return `Chain ${chainId}`;
}

export default function LiveStats() {
    const [overview, setOverview] = useState({ totalVolume: 0 });
    const [txCount, setTxCount] = useState(0);
    const [networkLabel, setNetworkLabel] = useState("Detecting...");
    const [blockNumber, setBlockNumber] = useState(0);

    const fallbackProvider = useMemo(
        () => new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL || "http://127.0.0.1:8545"),
        []
    );

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const [overviewData, recent] = await Promise.all([fetchAnalytics(), fetchRecentEvents(10)]);
                if (!mounted) {
                    return;
                }
                setOverview(overviewData);
                setTxCount(recent.length);
            } catch (error) {
                console.error("Live stats polling failed:", error.message);
            }
        }

        load();
        const timer = setInterval(load, 10000);
        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        async function syncNetwork() {
            try {
                const network = await fallbackProvider.getNetwork();
                if (mounted) {
                    setNetworkLabel(mapNetworkLabel(network.chainId));
                }
            } catch (error) {
                if (mounted) {
                    setNetworkLabel("Unavailable");
                }
            }
        }

        async function syncBlock() {
            try {
                const block = await fallbackProvider.getBlockNumber();
                if (mounted) {
                    setBlockNumber(block);
                }
            } catch (error) {
                if (mounted) {
                    setBlockNumber(0);
                }
            }
        }

        syncNetwork();
        syncBlock();

        const timer = setInterval(syncBlock, 12000);
        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, [fallbackProvider]);

    return (
        <section className="rounded-2xl border border-white/10 bg-card/80 p-4 shadow-lg shadow-black/20">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-text/70">Live Stats</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-dark/60 p-3">
                    <p className="text-text/60">Total ETH Lent</p>
                    <p className="mt-1 text-lg font-bold text-primary">
                        <CountUp value={Number(overview.totalVolume || 0)} suffix=" ETH" />
                    </p>
                </div>
                <div className="rounded-xl bg-dark/60 p-3">
                    <p className="text-text/60">Live Transactions</p>
                    <p className="mt-1 text-lg font-bold text-text">{txCount}</p>
                </div>
                <div className="rounded-xl bg-dark/60 p-3">
                    <p className="text-text/60">Network</p>
                    <p className="mt-1 text-lg font-bold text-emerald-300">{networkLabel}</p>
                </div>
                <div className="rounded-xl bg-dark/60 p-3">
                    <p className="text-text/60">Block Number</p>
                    <p className="mt-1 text-lg font-bold text-text">#{blockNumber}</p>
                </div>
            </div>
        </section>
    );
}
