import { useState } from "react";
import { useToast } from "../components/Toast";
import { useWeb3 } from "../context/Web3Context";
import {
    createLoan as createLoanTx,
    fundLoan as fundLoanTx,
    markDefault as markDefaultTx,
    repayLoan as repayLoanTx
} from "../utils/transactions";

export function useLoanAction() {
    const { contract } = useWeb3();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState("");
    const [error, setError] = useState("");

    async function execute(action) {
        if (!contract) {
            const message = "Connect wallet before sending transactions.";
            setError(message);
            toast.error(message);
            throw new Error(message);
        }

        setError("");

        return action();
    }

    async function createLoan(amount, durationDays, interestRate) {
        return execute(async () => {
            const result = await createLoanTx(contract, amount, durationDays, interestRate, {
                toast,
                handlers: {
                    onStart: setLoading,
                    onSuccess: (_, tx) => setTxHash(tx.hash),
                    onError: (message) => setError(message)
                }
            });
            return result;
        });
    }

    async function fundLoan(loanId, amount) {
        return execute(async () => {
            const result = await fundLoanTx(contract, loanId, amount, {
                toast,
                handlers: {
                    onStart: setLoading,
                    onSuccess: (_, tx) => setTxHash(tx.hash),
                    onError: (message) => setError(message)
                }
            });
            return result;
        });
    }

    async function repayLoan(loanId, repayAmount) {
        return execute(async () => {
            const result = await repayLoanTx(contract, loanId, repayAmount, {
                toast,
                handlers: {
                    onStart: setLoading,
                    onSuccess: (_, tx) => setTxHash(tx.hash),
                    onError: (message) => setError(message)
                }
            });
            return result;
        });
    }

    async function markDefault(loanId) {
        return execute(async () => {
            const result = await markDefaultTx(contract, loanId, {
                toast,
                handlers: {
                    onStart: setLoading,
                    onSuccess: (_, tx) => setTxHash(tx.hash),
                    onError: (message) => setError(message)
                }
            });
            return result;
        });
    }

    return { createLoan, fundLoan, repayLoan, markDefault, loading, txHash, error };
}
