export const mockAddresses = [
    { address: "0x11a1a96d9f89b3A31f2f57b57A4a1E57f85A8fA1", trustScore: 95 },
    { address: "0x22b2b96d9f89b3A31f2f57b57A4a1E57f85A8fB2", trustScore: 81 },
    { address: "0x33c3c96d9f89b3A31f2f57b57A4a1E57f85A8fC3", trustScore: 67 },
    { address: "0x44d4d96d9f89b3A31f2f57b57A4a1E57f85A8fD4", trustScore: 52 },
    { address: "0x55e5e96d9f89b3A31f2f57b57A4a1E57f85A8fE5", trustScore: 30 }
];

export const mockLoans = [
    { id: 1, amountEth: 0.1, durationDays: 7, status: "Open", interestRate: 8 },
    { id: 2, amountEth: 0.25, durationDays: 14, status: "Funded", interestRate: 10 },
    { id: 3, amountEth: 0.4, durationDays: 30, status: "Repaid", interestRate: 12 },
    { id: 4, amountEth: 0.6, durationDays: 60, status: "Defaulted", interestRate: 15 },
    { id: 5, amountEth: 1.1, durationDays: 30, status: "Repaid", interestRate: 9 },
    { id: 6, amountEth: 1.6, durationDays: 90, status: "Funded", interestRate: 11 },
    { id: 7, amountEth: 2.2, durationDays: 60, status: "Open", interestRate: 13 },
    { id: 8, amountEth: 2.8, durationDays: 14, status: "Repaid", interestRate: 7 },
    { id: 9, amountEth: 3.7, durationDays: 90, status: "Defaulted", interestRate: 16 },
    { id: 10, amountEth: 5.0, durationDays: 30, status: "Repaid", interestRate: 6 }
];

export const mockVolume30d = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));

    return {
        day: date.toISOString().slice(0, 10),
        volumeEth: Number((Math.random() * 4.5 + 0.3).toFixed(3))
    };
});

export const mockRecentEvents = [
    {
        id: "evt-1",
        eventType: "LoanCreated",
        loanId: 10,
        address: mockAddresses[0].address,
        amount: "500000000000000000",
        timestamp: Math.floor(Date.now() / 1000) - 120
    },
    {
        id: "evt-2",
        eventType: "LoanFunded",
        loanId: 9,
        address: mockAddresses[1].address,
        amount: "1700000000000000000",
        timestamp: Math.floor(Date.now() / 1000) - 300
    },
    {
        id: "evt-3",
        eventType: "LoanRepaid",
        loanId: 8,
        address: mockAddresses[2].address,
        amount: "880000000000000000",
        timestamp: Math.floor(Date.now() / 1000) - 420
    }
];
