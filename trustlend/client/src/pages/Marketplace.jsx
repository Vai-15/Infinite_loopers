import { useMemo, useState } from "react";
import { ethers } from "ethers";
import LoanCard from "../components/LoanCard";
import WalletConnectButton from "../components/WalletConnectButton";
import { useLoanAction } from "../hooks/useLoanAction";
import { useLoans } from "../hooks/useLoans";
import { useWeb3 } from "../context/Web3Context";

const sortOptions = [
    { value: "amount", label: "Amount" },
    { value: "duration", label: "Duration" },
    { value: "interest", label: "Interest" }
];

export default function Marketplace() {
    const { account, isConnected, connectWallet } = useWeb3();
    const { loans, loading, error, refresh } = useLoans();
    const { fundLoan, loading: txLoading, error: txError } = useLoanAction();
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("amount");
    const [fundingLoanId, setFundingLoanId] = useState(null);

    const filteredLoans = useMemo(() => {
        const bySearch = loans.filter((loan) =>
            loan.borrower.toLowerCase().includes(search.toLowerCase())
        );

        return bySearch.sort((a, b) => {
            if (sortBy === "duration") {
                return b.durationDays - a.durationDays;
            }
            if (sortBy === "interest") {
                return b.interestRate - a.interestRate;
            }
            if (a.amountWei.eq(b.amountWei)) {
                return 0;
            }
            return a.amountWei.gt(b.amountWei) ? -1 : 1;
        });
    }, [loans, search, sortBy]);

    async function handleFundLoan(loan) {
        try {
            let activeAccount = account;
            if (!isConnected) {
                const connection = await connectWallet();
                activeAccount = connection?.account || activeAccount;
            }

            if (activeAccount && activeAccount.toLowerCase() === loan.borrower.toLowerCase()) {
                alert("Borrowers cannot fund their own loans.");
                return;
            }

            setFundingLoanId(loan.id);
            await fundLoan(loan.id, ethers.utils.formatEther(loan.amount));
            await refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setFundingLoanId(null);
        }
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl font-bold text-text">Loan Marketplace</h1>
                {!isConnected && <WalletConnectButton />}
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-3">
                <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search borrower address"
                    className="rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text outline-none ring-primary/40 focus:ring"
                />
                <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text outline-none ring-primary/40 focus:ring"
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            Sort by {option.label}
                        </option>
                    ))}
                </select>
                <div className="rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text/70">
                    Loans Available: {filteredLoans.length}
                </div>
            </div>

            {(error || txError) && (
                <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error || txError}
                </p>
            )}

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-52 animate-pulse rounded-2xl border border-white/10 bg-card/60"
                        />
                    ))}
                </div>
            ) : filteredLoans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-dark/50 p-12 text-center">
                    <h3 className="text-xl font-semibold text-text">No open loans found</h3>
                    <p className="mt-2 text-sm text-text/70">
                        Try adjusting filters or create a new request from the Borrow dashboard.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredLoans.map((loan) => (
                        <LoanCard
                            key={loan.id}
                            loan={{ ...loan, durationDays: Math.round(Number(loan.duration) / 86400) }}
                            onFund={handleFundLoan}
                            funding={txLoading && fundingLoanId === loan.id}
                            disabled={!isConnected}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}
