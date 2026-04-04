import { fetchLoanById } from "./queries";

export function listenLoanCreated(contract, callback) {
    contract.on("LoanCreated", callback);
    return () => contract.off("LoanCreated", callback);
}

export function listenLoanFunded(contract, callback) {
    contract.on("LoanFunded", callback);
    return () => contract.off("LoanFunded", callback);
}

export function listenLoanRepaid(contract, callback) {
    contract.on("LoanRepaid", callback);
    return () => contract.off("LoanRepaid", callback);
}

export function listenLoanDefaulted(contract, callback) {
    contract.on("LoanDefaulted", callback);
    return () => contract.off("LoanDefaulted", callback);
}

export function cleanupContractListeners(contract) {
    if (contract) {
        contract.removeAllListeners();
    }
}

export async function fetchEventHistory(contract, provider, address) {
    if (!contract || !provider || !address) {
        return [];
    }

    const lower = address.toLowerCase();

    const [createdEvents, fundedEvents, repaidEvents, defaultedEvents] = await Promise.all([
        contract.queryFilter(contract.filters.LoanCreated(null, address), 0, "latest"),
        contract.queryFilter(contract.filters.LoanFunded(null, address), 0, "latest"),
        contract.queryFilter(contract.filters.LoanRepaid(null, address), 0, "latest"),
        contract.queryFilter(contract.filters.LoanDefaulted(), 0, "latest")
    ]);

    const createdRows = await Promise.all(
        createdEvents.map(async (event) => {
            const block = await provider.getBlock(event.blockNumber);
            return {
                type: "Created",
                loanId: Number(event.args.loanId),
                amount: event.args.amount,
                blockNumber: event.blockNumber,
                timestamp: block.timestamp,
                txHash: event.transactionHash
            };
        })
    );

    const fundedRows = await Promise.all(
        fundedEvents.map(async (event) => {
            const block = await provider.getBlock(event.blockNumber);
            const loan = await fetchLoanById(contract, event.args.loanId);
            return {
                type: "Funded",
                loanId: Number(event.args.loanId),
                amount: loan.amount,
                blockNumber: event.blockNumber,
                timestamp: block.timestamp,
                txHash: event.transactionHash
            };
        })
    );

    const repaidRows = await Promise.all(
        repaidEvents.map(async (event) => {
            const block = await provider.getBlock(event.blockNumber);
            const loan = await fetchLoanById(contract, event.args.loanId);
            const amount = loan.amount.add(loan.amount.mul(loan.interestRate).div(100));
            return {
                type: "Repaid",
                loanId: Number(event.args.loanId),
                amount,
                blockNumber: event.blockNumber,
                timestamp: block.timestamp,
                txHash: event.transactionHash
            };
        })
    );

    const defaultedRows = await Promise.all(
        defaultedEvents.map(async (event) => {
            const loan = await fetchLoanById(contract, event.args.loanId);
            const isMine =
                loan.borrower.toLowerCase() === lower || loan.lender.toLowerCase() === lower;

            if (!isMine) {
                return null;
            }

            const block = await provider.getBlock(event.blockNumber);
            return {
                type: "Defaulted",
                loanId: Number(event.args.loanId),
                amount: loan.amount,
                blockNumber: event.blockNumber,
                timestamp: block.timestamp,
                txHash: event.transactionHash
            };
        })
    );

    return [...createdRows, ...fundedRows, ...repaidRows, ...defaultedRows.filter(Boolean)].sort(
        (a, b) => b.blockNumber - a.blockNumber
    );
}
