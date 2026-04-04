import AddressAvatar from "@/components/AddressAvatar";
import { formatAddress, formatCurrency, formatStatus } from "@/utils/formatters";

import TrustScoreBadge from "./TrustScoreBadge";

function riskFromScore(score) {
  const s = Number(score) || 300;
  if (s >= 720) return { label: "Low risk", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (s >= 580) return { label: "Medium risk", className: "bg-amber-500/15 text-amber-800 dark:text-amber-200" };
  return { label: "High risk", className: "bg-rose-500/15 text-rose-800 dark:text-rose-200" };
}

export default function LoanCard({ loan, onFund, funding = false, disabled = false }) {
  const score = loan.borrower_credit_score || 300;
  const risk = riskFromScore(score);

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-card/80 dark:shadow-black/20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <AddressAvatar address={loan.borrower_wallet} size={40} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-text/60">Loan #{loan.id}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-text">{formatCurrency(loan.amount_usdc)}</h3>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <TrustScoreBadge score={score} />
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${risk.className}`}>
            {risk.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-text/80">
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
