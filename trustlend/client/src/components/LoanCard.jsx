import TrustScoreBadge from "./TrustScoreBadge";
import { formatAddress, formatEth } from "../utils/formatters";

export default function LoanCard({ loan, onFund, funding, disabled }) {
    return (
        <article className="rounded-2xl border border-white/10 bg-card/80 p-5 shadow-lg shadow-black/20">
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <p className="text-xs uppercase tracking-wide text-text/60">Loan #{loan.id}</p>
                    <h3 className="text-2xl font-bold text-text">{formatEth(loan.amount)}</h3>
                </div>
                <TrustScoreBadge score={loan.trustScore} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-text/80">
                <p>Duration: {loan.durationDays} days</p>
                <p>Interest: {loan.interestRate}%</p>
                <p className="col-span-2">Borrower: {formatAddress(loan.borrower)}</p>
            </div>

            <button
                onClick={() => onFund(loan)}
                disabled={disabled || funding}
                className="mt-5 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {funding ? "Funding..." : "Fund Loan"}
            </button>
        </article>
    );
}
