import { ethers } from "ethers";

function parseTxError(error) {
    if (error?.code === 4001) {
        return { type: "wallet", message: "Transaction rejected in MetaMask." };
    }

    const message =
        error?.error?.message ||
        error?.reason ||
        error?.data?.message ||
        error?.message ||
        "Transaction failed.";

    return { type: "contract", message };
}

async function runTransaction(executor, labels, toast, handlers) {
    const { onStart, onSuccess, onError } = handlers || {};

    try {
        onStart?.(true);
        toast?.pending(labels.pending);

        const tx = await executor();
        const receipt = await tx.wait();

        onSuccess?.(receipt, tx);
        toast?.success(labels.success);

        return { txHash: tx.hash, receipt };
    } catch (error) {
        const parsed = parseTxError(error);
        toast?.error(parsed.message);
        onError?.(parsed.message, parsed.type, error);
        throw error;
    } finally {
        onStart?.(false);
    }
}

export async function createLoan(contract, amount, durationDays, interestRate, options = {}) {
    const weiAmount = ethers.utils.parseEther(amount.toString());

    const result = await runTransaction(
        () => contract.createLoan(weiAmount, Number(durationDays), Number(interestRate)),
        {
            pending: "Submitting loan request...",
            success: "Loan request created successfully."
        },
        options.toast,
        options.handlers
    );

    const event = result.receipt.events?.find((entry) => entry.event === "LoanCreated");
    const loanId = event?.args?.loanId ? Number(event.args.loanId) : null;

    return { ...result, loanId };
}

export async function fundLoan(contract, loanId, amount, options = {}) {
    const wei = ethers.utils.parseEther(amount.toString());

    return runTransaction(
        () => contract.fundLoan(Number(loanId), { value: wei }),
        {
            pending: `Funding loan #${loanId}...`,
            success: `Loan #${loanId} funded successfully.`
        },
        options.toast,
        options.handlers
    );
}

export async function repayLoan(contract, loanId, repayAmount, options = {}) {
    return runTransaction(
        () => contract.repayLoan(Number(loanId), { value: repayAmount }),
        {
            pending: `Repaying loan #${loanId}...`,
            success: `Loan #${loanId} repaid successfully.`
        },
        options.toast,
        options.handlers
    );
}

export async function markDefault(contract, loanId, options = {}) {
    return runTransaction(
        () => contract.markDefault(Number(loanId)),
        {
            pending: `Marking loan #${loanId} as defaulted...`,
            success: `Loan #${loanId} marked as defaulted.`
        },
        options.toast,
        options.handlers
    );
}
