import { useState } from "react";

import CreditGauge from "@/components/CreditGauge";
import { useWeb3 } from "@/context/Web3Context";
import { useCredit } from "@/hooks/useCredit";
import { useLoanActions } from "@/hooks/useLoanActions";
import { CHAIN } from "@/utils/constants";
import { sanitizeIntegerInput, sanitizeNumericInput, sanitizeText } from "@/utils/security";

const STEPS = ["Amount & purpose", "Terms & guarantor", "Credit score", "Submit on-chain"];

export default function LoanApply() {
  const { account, loanFactory } = useWeb3();
  const { data: scoreData, scoreWallet, loading: scoring } = useCredit();
  const { createLoan, loading, error } = useLoanActions();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    amount_usdc: "",
    purpose: "",
    duration_days: "",
    interest_rate: "",
    guarantor_wallet: "",
    description: ""
  });
  const [txHash, setTxHash] = useState("");

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function validateStep(i) {
    const amt = Number(sanitizeNumericInput(form.amount_usdc));
    const dur = Number(sanitizeIntegerInput(form.duration_days));
    const ir = Number(sanitizeNumericInput(form.interest_rate));
    if (i === 0) {
      return amt >= 10 && amt <= 10000 && sanitizeText(form.purpose || "").length >= 2;
    }
    if (i === 1) {
      return dur >= 7 && dur <= 365 && ir >= 1 && ir <= 50 && form.guarantor_wallet?.length === 42;
    }
    return true;
  }

  async function runCreditStep() {
    if (!account) return;
    await scoreWallet(account, {
      wallet_age_days: 400,
      num_transactions: 40,
      avg_tx_value_usd: 200,
      num_previous_loans: 1,
      repayment_rate: 0.78,
      default_count: 0,
      community_vouches: 3,
      monthly_income_usd: 3500,
      days_employed: 900
    });
    setStep(3);
  }

  const monthly =
    form.amount_usdc && form.interest_rate
      ? (
          (Number(form.amount_usdc) * (1 + Number(form.interest_rate) / 100)) /
          Math.max(1, Number(form.duration_days || 30) / 30)
        ).toFixed(2)
      : "—";

  async function submit() {
    if (!account) return;
    const payload = {
      amount_usdc: Number(sanitizeNumericInput(form.amount_usdc)),
      duration_days: Number(sanitizeIntegerInput(form.duration_days)),
      interest_rate: Number(sanitizeNumericInput(form.interest_rate)),
      purpose: sanitizeText(form.purpose),
      description: sanitizeText(form.description || ""),
      guarantor_wallet: form.guarantor_wallet.trim(),
      borrower_wallet: account,
      borrower_credit_score: scoreData?.score ?? null,
      borrower_did: `did:polygon:${account}`
    };
    const res = await createLoan(payload);
    setTxHash(res?.receipt?.hash || "");
  }

  const explorer =
    CHAIN.id === 31337
      ? ""
      : CHAIN.id === 80002
        ? "https://amoy.polygonscan.com/tx/"
        : "https://polygonscan.com/tx/";

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4">
        <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600 dark:text-text/70">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              i === step ? "bg-primary text-white" : "bg-white/10 text-text/70"
            }`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-card/80 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-text">Loan amount</h1>
            <input
              type="number"
              min={10}
              max={10000}
              value={form.amount_usdc}
              onChange={(e) => update("amount_usdc", e.target.value)}
              placeholder="USDC amount ($10 – $10,000)"
              className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-text"
            />
            <textarea
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              placeholder="Purpose (min 2 chars)"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-text"
            />
            <button
              type="button"
              disabled={!validateStep(0)}
              onClick={() => setStep(1)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text">Duration & rate</h2>
            <input
              type="number"
              min={7}
              max={365}
              value={form.duration_days}
              onChange={(e) => update("duration_days", e.target.value)}
              placeholder="Duration days (7–365)"
              className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-text"
            />
            <input
              type="number"
              min={1}
              max={50}
              value={form.interest_rate}
              onChange={(e) => update("interest_rate", e.target.value)}
              placeholder="APR % (1–50)"
              className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-text"
            />
            <input
              value={form.guarantor_wallet}
              onChange={(e) => update("guarantor_wallet", e.target.value)}
              placeholder="Guarantor wallet 0x…"
              className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 font-mono text-sm text-text"
            />
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-dark px-4 py-3 text-text"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className="rounded-xl border border-white/20 px-4 py-2 text-sm">
                Back
              </button>
              <button
                type="button"
                disabled={!validateStep(1)}
                onClick={() => setStep(2)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text">Credit score</h2>
            <p className="text-sm text-text/70">Estimated monthly payment (rough): ${monthly}</p>
            <CreditGauge score={scoreData?.score || 300} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => scoreWallet(account, {})}
                disabled={scoring || !account}
                className="rounded-xl border border-primary/40 px-4 py-2 text-sm text-primary disabled:opacity-50"
              >
                {scoring ? "Scoring…" : "Refresh score"}
              </button>
              <button
                type="button"
                onClick={runCreditStep}
                disabled={scoring || !account}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Continue
              </button>
              <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-white/20 px-4 py-2 text-sm">
                Back
              </button>
            </div>
            {scoreData?.top_factors && (
              <p className="text-xs text-text/60">Top factors: {scoreData.top_factors.join(", ")}</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text">Review & submit</h2>
            <ul className="text-sm text-text/80">
              <li>Amount: {form.amount_usdc} USDC</li>
              <li>Term: {form.duration_days} days @ {form.interest_rate}% APR</li>
              <li>Guarantor: {form.guarantor_wallet?.slice(0, 10)}…</li>
              <li>Score: {scoreData?.score ?? "—"}</li>
            </ul>
            {!loanFactory && (
              <p className="text-amber-300 text-sm">Deploy contracts and run `node scripts/sync_env.js` to set addresses.</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-white/20 px-4 py-2 text-sm">
                Back
              </button>
              <button
                type="button"
                disabled={loading || !account || !loanFactory}
                onClick={submit}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Submitting…" : "Submit to blockchain"}
              </button>
            </div>
            {txHash && explorer && (
              <a href={`${explorer}${txHash}`} target="_blank" rel="noreferrer" className="text-sm text-sky-300 underline">
                View transaction
              </a>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </section>
    </main>
  );
}
