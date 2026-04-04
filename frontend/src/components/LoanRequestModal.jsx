import { useState } from "react";

import { sanitizeIntegerInput, sanitizeNumericInput, sanitizeText } from "@/utils/security";

export default function LoanRequestModal({ isOpen, onClose, onSubmit, loading }) {
  const [amount, setAmount] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [purpose, setPurpose] = useState("");

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      amount_usdc: Number(sanitizeNumericInput(amount)),
      duration_days: Number(sanitizeIntegerInput(durationDays)),
      interest_rate: Number(sanitizeNumericInput(interestRate)),
      purpose: sanitizeText(purpose || "General")
    };

    if (payload.amount_usdc <= 0 || payload.duration_days <= 0 || payload.interest_rate <= 0) {
      return;
    }

    await onSubmit(payload);
    setAmount("");
    setDurationDays("");
    setInterestRate("");
    setPurpose("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-dark p-6 shadow-2xl shadow-black/40">
        <h2 className="mb-5 text-xl font-bold text-text">Request a New Loan</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-text/80">Amount (USDC)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-text"
              placeholder="500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text/80">Duration (days)</label>
            <input
              type="number"
              min="1"
              value={durationDays}
              onChange={(event) => setDurationDays(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-text"
              placeholder="30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text/80">Interest Rate (%)</label>
            <input
              type="number"
              min="0"
              value={interestRate}
              onChange={(event) => setInterestRate(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-text"
              placeholder="12"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text/80">Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-text"
              placeholder="Inventory expansion"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-text/90"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
