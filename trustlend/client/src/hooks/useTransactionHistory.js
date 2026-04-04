import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import {
    cleanupContractListeners,
    fetchEventHistory,
    listenLoanCreated,
    listenLoanDefaulted,
    listenLoanFunded,
    listenLoanRepaid
} from "../utils/events";

export function useTransactionHistory() {
    const { account, contract, provider } = useWeb3();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        if (!account || !contract || !provider) {
            setEvents([]);
            return;
        }

        try {
            setLoading(true);
            setError("");
            const history = await fetchEventHistory(contract, provider, account);
            setEvents(history);
        } catch (err) {
            setError(err?.reason || err?.message || "Failed to fetch transaction history.");
        } finally {
            setLoading(false);
        }
    }, [account, contract, provider]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!contract) {
            return undefined;
        }

        const unsubscribers = [
            listenLoanCreated(contract, refresh),
            listenLoanFunded(contract, refresh),
            listenLoanRepaid(contract, refresh),
            listenLoanDefaulted(contract, refresh)
        ];

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe?.());
            cleanupContractListeners(contract);
        };
    }, [contract, refresh]);

    return { events, loading, error, refresh };
}
