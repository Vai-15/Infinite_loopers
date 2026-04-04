import { useEffect, useState } from "react";

import { api } from "@/services/api";
import { formatAddress, formatCurrency } from "@/utils/formatters";

export default function CommunityVouch({ borrowerWallet, voucherWallet, onUpdated }) {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      if (!borrowerWallet) return;
      try {
        const [v, p] = await Promise.all([
          api.getVouchesDetailed(borrowerWallet),
          api.getPoolStats()
        ]);
        setRows(Array.isArray(v) ? v : []);
        setStats(p);
      } catch {
        setRows([]);
      }
    }
    load();
  }, [borrowerWallet, onUpdated]);

  async function submit() {
    if (!borrowerWallet || !voucherWallet || !amount) return;
    setBusy(true);
    try {
      await api.postVouchDetailed({
        borrower_wallet: borrowerWallet,
        voucher_wallet: voucherWallet,
        amount_usdc: Number(amount),
        loan_id: null,
        tx_hash: null
      });
      setAmount("");
      setOpen(false);
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  const total = rows.reduce((s, r) => s + Number(r.amount_usdc || 0), 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-card/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-text">Community trust</h3>
          <p className="text-xs text-text/70">
            {rows.length} vouches · {formatCurrency(total)} staked
            {stats ? ` · Pool active vouchers: ${stats.active_vouchers}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg bg-primary/20 px-3 py-1 text-xs font-semibold text-primary"
        >
          Vouch
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {rows.slice(0, 8).map((r, i) => (
          <span
            key={`${r.voucher_wallet}-${i}`}
            className="rounded-full border border-white/10 bg-dark px-2 py-0.5 text-[10px] text-text/80"
            title={r.voucher_wallet}
          >
            {formatAddress(r.voucher_wallet)}
          </span>
        ))}
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Stake (USDC)"
            className="w-full rounded-lg border border-white/10 bg-dark px-3 py-2 text-sm text-text"
          />
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : "Submit vouch"}
          </button>
        </div>
      )}
    </div>
  );
}
