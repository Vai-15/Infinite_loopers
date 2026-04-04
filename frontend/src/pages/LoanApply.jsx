import { useState } from "react";

import { useContract } from "@/hooks/useContract";
import { useCredit } from "@/hooks/useCredit";
import { useLoanActions } from "@/hooks/useLoanActions";

export default function LoanApply() {
  const { account } = useContract();
  const { data: scoreData, scoreWallet, loading: scoring } = useCredit();
  const { createLoan, loading, error } = useLoanActions();

  const [form, setForm] = useState({
    amount_usdc: "",
    duration_days: "",
    interest_rate: "",
    purpose: ""
  });

  const [submitted, setSubmitted] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function previewScore() {
    if (!account) return;
    await scoreWallet(account, {
      wallet_age_days: 320,
      num_transactions: 90,
      avg_tx_value_usd: 140,
      num_previous_loans: 2,
      repayment_rate: 0.82,
      default_count: 0,
      community_vouches: 3,
      monthly_income_usd: 2600,
      days_employed: 1100
    });
  }

  async function submit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      borrower_wallet: account,
      amount_usdc: Number(form.amount_usdc),
      duration_days: Number(form.duration_days),
      interest_rate: Number(form.interest_rate),
      borrower_credit_score: scoreData?.score ?? null
    };

    await createLoan(payload);
    setSubmitted(true);
    setForm({ amount_usdc: "", duration_days: "", interest_rate: "", purpose: "" });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-white/10 bg-card/80 p-6">
        <h1 className="text-2xl font-bold text-text">Apply for a Loan</h1>
        <p className="mt-2 text-sm text-text/70">Complete the form and preview your AI-assisted score before submission.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input
            value={form.amount_usdc}
            onChange={(e) => update("amount_usdc", e.target.value)}
            placeholder="Amount (USDC)"
            className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text"
            required
          />
          <input
            value={form.duration_days}
            onChange={(e) => update("duration_days", e.target.value)}
            placeholder="Duration (days)"
            className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text"
            required
          />
          <input
            value={form.interest_rate}
            onChange={(e) => update("interest_rate", e.target.value)}
            placeholder="Interest rate (%)"
            className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text"
            required
          />
          <input
            value={form.purpose}
            onChange={(e) => update("purpose", e.target.value)}
            placeholder="Purpose"
            className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-sm text-text"
            required
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={previewScore}
              disabled={scoring || !account}
              className="rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
            >
              {scoring ? "Scoring..." : "Preview Credit Score"}
            </button>
            <button
              type="submit"
              disabled={loading || !account}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Loan Request"}
            </button>
          </div>
        </form>

        {scoreData && <p className="mt-4 text-sm text-emerald-300">Predicted score: {scoreData.score} ({scoreData.risk_level})</p>}
        {submitted && <p className="mt-2 text-sm text-sky-300">Loan request submitted successfully.</p>}
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </section>
    </main>
  );
}
