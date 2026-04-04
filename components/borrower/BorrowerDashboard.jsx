"use client";

/**
 * Borrower: create loans, respond to lender review (docs + guarantor), final submit, collect funds.
 * Lists filtered by connected wallet (normalized in context).
 */

import { useState } from "react";

import { normalizeAddr } from "@/lib/loanPersistence";
import { STATUS } from "@/lib/workflow";

import { useLendwise } from "../LendwiseProvider";
import StatusBadge from "../StatusBadge";

export default function BorrowerDashboard() {
  const {
    walletAddress,
    loanRequests,
    requestLoan,
    borrowerSubmitGuarantorFlow,
    borrowerFinalSubmit,
    badgeFor,
    error,
    setError
  } = useLendwise();

  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lenderAddr, setLenderAddr] = useState("");
  const [docNote, setDocNote] = useState("");
  const [guarantorWallet, setGuarantorWallet] = useState("");

  const me = normalizeAddr(walletAddress);
  const mine = loanRequests.filter((l) => l.borrower === me);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-bold text-white">New loan request</h2>
        <p className="mt-1 text-sm text-slate-400">Step 1 — send request to a lender</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-400">Amount (POL)</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              placeholder="1.5"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Purpose</span>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              placeholder="Working capital"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Lender wallet address</span>
            <input
              value={lenderAddr}
              onChange={(e) => setLenderAddr(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
              placeholder="0x…"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("");
            requestLoan({ amount, purpose, lenderAddress: lenderAddr });
          }}
          className="mt-4 rounded-xl bg-teal-600 px-6 py-2.5 font-semibold text-white hover:bg-teal-500"
        >
          Request Loan
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">Your applications</h2>
        {mine.length === 0 && <p className="text-slate-500">No requests yet.</p>}
        {mine.map((loan) => (
          <article key={loan.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-400">#{loan.id.slice(-8)}</span>
              <StatusBadge label={badgeFor(loan.status)} />
            </div>
            <p className="mt-2 text-white">
              <span className="text-slate-400">Amount:</span> {loan.amount} POL
            </p>
            <p className="text-slate-300">{loan.purpose}</p>

            {loan.status === STATUS.UNDER_REVIEW && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                <p className="text-sm font-semibold text-teal-300">Step 3 — Documents & guarantor</p>
                <label className="mt-2 block text-sm">
                  <span className="text-slate-400">Document description / IPFS hash (mock)</span>
                  <textarea
                    value={docNote}
                    onChange={(e) => setDocNote(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    rows={2}
                  />
                </label>
                <label className="mt-2 block text-sm">
                  <span className="text-slate-400">Guarantor wallet</span>
                  <input
                    value={guarantorWallet}
                    onChange={(e) => setGuarantorWallet(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => borrowerSubmitGuarantorFlow(loan.id, { documentsNote: docNote, guarantorWallet })}
                  className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Send to guarantor
                </button>
              </div>
            )}

            {loan.status === STATUS.GUARANTEED && (
              <div className="mt-4">
                <p className="text-sm text-emerald-300">Guarantor approved — submit final package to lender</p>
                <button
                  type="button"
                  onClick={() => borrowerFinalSubmit(loan.id)}
                  className="mt-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Send final request + documents to lender
                </button>
              </div>
            )}

            {loan.fundTxHash && (
              <p className="mt-2 font-mono text-xs text-slate-500">Fund tx: {loan.fundTxHash.slice(0, 18)}…</p>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
