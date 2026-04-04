import { useEffect, useMemo, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { fetchTrustScore } from "../utils/queries";

export function useTrustScore(address) {
    const { contract } = useWeb3();
    const [score, setScore] = useState(0);

    useEffect(() => {
        async function loadScore() {
            if (!contract || !address) {
                setScore(0);
                return;
            }

            try {
                const value = await fetchTrustScore(contract, address);
                setScore(value);
            } catch (error) {
                setScore(0);
            }
        }

        loadScore();
    }, [address, contract]);

    const metadata = useMemo(() => {
        if (score <= 33) {
            return { label: "Low", color: "text-red-300" };
        }
        if (score <= 66) {
            return { label: "Medium", color: "text-yellow-300" };
        }
        return { label: "High", color: "text-emerald-300" };
    }, [score]);

    return { score, label: metadata.label, color: metadata.color };
}
