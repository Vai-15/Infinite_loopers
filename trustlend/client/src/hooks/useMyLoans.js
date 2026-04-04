import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { fetchBorrowerLoans, fetchLenderLoans } from "../utils/queries";
import { assertValidEthAddress } from "../utils/security";

export function useMyLoans(role) {
    const { account, contract, isConnected } = useWeb3();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        if (!contract || !account || !isConnected) {
            setLoans([]);
            return;
        }

        try {
            setLoading(true);
            setError("");
            assertValidEthAddress(account, "Connected wallet");
            const data =
                role === "lender"
                    ? await fetchLenderLoans(contract, account)
                    : await fetchBorrowerLoans(contract, account);
            setLoans(data);
        } catch (err) {
            setError(err?.reason || err?.message || `Failed to fetch ${role} loans.`);
        } finally {
            setLoading(false);
        }
    }, [account, contract, isConnected, role]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { loans, loading, error, refresh };
}
