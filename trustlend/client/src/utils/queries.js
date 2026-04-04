function normalizeLoan(loan) {
    return {
        id: Number(loan.id),
        borrower: loan.borrower,
        lender: loan.lender,
        amount: loan.amount,
        duration: Number(loan.duration),
        startTime: Number(loan.startTime),
        status: Number(loan.status),
        interestRate: Number(loan.interestRate)
    };
}

export async function fetchLoanById(contract, loanId) {
    const loan = await contract.getLoan(Number(loanId));
    return normalizeLoan(loan);
}

export async function fetchAllOpenLoans(contract) {
    const ids = await contract.getOpenLoans();
    const loans = await Promise.all(ids.map((id) => fetchLoanById(contract, id)));

    return Promise.all(
        loans.map(async (loan) => {
            const trustScore = await fetchTrustScore(contract, loan.borrower);
            return {
                ...loan,
                trustScore
            };
        })
    );
}

export async function fetchBorrowerLoans(contract, address) {
    const ids = await contract.getBorrowerLoans(address);
    return Promise.all(ids.map((id) => fetchLoanById(contract, id)));
}

export async function fetchLenderLoans(contract, address) {
    const ids = await contract.getLenderLoans(address);
    return Promise.all(ids.map((id) => fetchLoanById(contract, id)));
}

export async function fetchTrustScore(contract, address) {
    const score = await contract.getTrustScore(address);
    return Number(score);
}
