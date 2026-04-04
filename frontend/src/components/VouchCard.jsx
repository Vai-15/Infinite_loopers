import { formatAddress, formatCurrency } from "@/utils/formatters";

export default function VouchCard({ voucherWallet, borrowerWallet, amountUsdc, loanId }) {
  return (
    <article className="rounded-lg border border-white/10 bg-card/80 p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-text">Community Vouch</h3>
      <p className="mt-1 text-sm text-text/70">Voucher: {formatAddress(voucherWallet)}</p>
      <p className="text-sm text-text/70">Borrower: {formatAddress(borrowerWallet)}</p>
      <p className="text-sm text-text/70">Stake: {formatCurrency(amountUsdc)}</p>
      <p className="text-sm text-text/70">Loan ID: {loanId || "N/A"}</p>
    </article>
  );
}
