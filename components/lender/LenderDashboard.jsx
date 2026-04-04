"use client";

/** Lender: sees loans where `lender` matches this wallet (shared store). */

import { normalizeAddr } from "@/lib/loanPersistence";
import { STATUS } from "@/lib/workflow";

import { useLendwise } from "../LendwiseProvider";
import StatusBadge from "../StatusBadge";

function short(a) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function LenderDashboard() {
  const { walletAddress, loanRequests, lenderReviewRequest, lenderApproveAndFund, badgeFor, transactionStatus } =
    useLendwise();

  const me = normalizeAddr(walletAddress);
  const incoming = loanRequests.filter((l) => l.lender === me);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Incoming loan requests</h2>
      {!transactionStatus.idle && (
        <p className="text-sm text-amber-300">{transactionStatus.label}</p>
      )}
      {incoming.length === 0 && <p className="text-slate-500">No requests to this wallet.</p>}
      <ul className="space-y-4">
        {incoming.map((loan) => (
          <li key={loan.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge label={badgeFor(loan.status)} />
              <span className="text-sm text-slate-400">#{loan.id.slice(-8)}</span>
            </div>
            <p className="mt-3 text-white">
              <span className="text-slate-500">Borrower:</span>{" "}
              <span className="font-mono text-sm">{short(loan.borrower)}</span>
            </p>
            <p className="text-slate-200">
              <span className="text-slate-500">Amount:</span> {loan.amount} POL
            </p>
            <p className="text-slate-300">{loan.purpose}</p>

            {loan.status === STATUS.PENDING && (
              <button
                type="button"
                onClick={() => lenderReviewRequest(loan.id)}
                className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Review Request
              </button>
            )}

            {(loan.status === STATUS.UNDER_REVIEW || loan.status === STATUS.AWAITING_GUARANTOR) && (
              <p className="mt-3 text-xs text-slate-500">Waiting for borrower / guarantor workflow…</p>
            )}

            {loan.status === STATUS.FINAL_REVIEW && (
              <div className="mt-4 rounded-xl border border-teal-800/50 bg-teal-950/20 p-4">
                <p className="text-sm font-semibold text-teal-300">Final application</p>
                <p className="mt-1 text-xs text-slate-400">Docs: {loan.documentsNote || "—"}</p>
                <p className="text-xs text-slate-400">Guarantor: {short(loan.guarantor)}</p>
                <button
                  type="button"
                  onClick={() => lenderApproveAndFund(loan.id)}
                  disabled={!transactionStatus.idle}
                  className="mt-3 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Approve & Send Funds
                </button>
              </div>
            )}

            {loan.status === STATUS.FUNDED || loan.status === STATUS.COLLECTED ? (
              <p className="mt-3 font-mono text-xs text-teal-500/80">
                Tx: {loan.fundTxHash || "—"}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
