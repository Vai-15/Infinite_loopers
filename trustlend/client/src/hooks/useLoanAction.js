import { useState } from "react";
import { useToast } from "../components/Toast";
import { useWeb3 } from "../context/Web3Context";
import { assertValidEthAddress, sanitizeIntegerInput, sanitizeNumericInput } from "../utils/security";
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
        try {
            if (!contract) {
                throw new Error("Connect wallet before sending transactions.");
            }

            const signerAddress = await contract.signer.getAddress();
            assertValidEthAddress(signerAddress, "Signer address");

            setError("");
            return action();
        } catch (err) {
            const message = err?.message || "Unable to execute transaction.";
            setError(message);
            toast.error(message);
            throw err;
        }
    }

    async function createLoan(amount, durationDays, interestRate) {
        return execute(async () => {
            const safeAmount = sanitizeNumericInput(amount);
            const safeDuration = sanitizeIntegerInput(durationDays);
            const safeInterest = sanitizeIntegerInput(interestRate);

            if (Number(safeAmount) <= 0) {
                throw new Error("Amount must be greater than zero.");
            }
            if (Number(safeDuration) < 1 || Number(safeDuration) > 365) {
                throw new Error("Duration must be between 1 and 365 days.");
            }
            if (Number(safeInterest) < 0 || Number(safeInterest) > 50) {
                throw new Error("Interest rate must be between 0 and 50%.");
            }

            const result = await createLoanTx(contract, safeAmount, safeDuration, safeInterest, {
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
            const safeAmount = sanitizeNumericInput(amount);
            if (Number(safeAmount) <= 0) {
                throw new Error("Funding amount must be greater than zero.");
            }

            const result = await fundLoanTx(contract, loanId, safeAmount, {
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
