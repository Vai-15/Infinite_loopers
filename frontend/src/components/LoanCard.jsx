import { formatAddress, formatCurrency, formatStatus } from "@/utils/formatters";

import TrustScoreBadge from "./TrustScoreBadge";

export default function LoanCard({ loan, onFund, funding = false, disabled = false }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-card/80 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-text/60">Loan #{loan.id}</p>
          <h3 className="text-2xl font-bold text-text">{formatCurrency(loan.amount_usdc)}</h3>
        </div>
        <TrustScoreBadge score={loan.borrower_credit_score || 300} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-text/80">
        <p>Duration: {loan.duration_days} days</p>
        <p>Interest: {loan.interest_rate}%</p>
        <p className="col-span-2">Borrower: {formatAddress(loan.borrower_wallet)}</p>
        <p className={`col-span-2 ${formatStatus(loan.status).color}`}>Status: {formatStatus(loan.status).label}</p>
      </div>

      {onFund && (
        <button
          type="button"
          onClick={() => onFund(loan)}
          disabled={disabled || funding || loan.status !== "PENDING"}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {funding ? "Funding..." : "Fund Loan"}
        </button>
      )}
    </article>
  );
}
