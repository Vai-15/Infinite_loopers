import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { cleanupContractListeners, listenLoanCreated } from "../utils/events";
import { fetchAllOpenLoans } from "../utils/queries";

export function useLoans() {
    const { contract } = useWeb3();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        if (!contract) {
            setLoans([]);
            return;
        }

        try {
            setLoading(true);
            setError("");
            const data = await fetchAllOpenLoans(contract);
            setLoans(data);
        } catch (err) {
            setError(err?.reason || err?.message || "Failed to fetch loans.");
        } finally {
            setLoading(false);
        }
    }, [contract]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!contract) {
            return undefined;
        }

        const unsubscribe = listenLoanCreated(contract, () => {
            refresh();
        });

        return () => {
            unsubscribe();
            cleanupContractListeners(contract);
        };
    }, [contract, refresh]);

    return { loans, loading, error, refresh };
}
