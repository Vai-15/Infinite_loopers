"use client";

/** Guarantor: pending rows where `guarantor` matches wallet and status is awaiting guarantor. */

import { normalizeAddr } from "@/lib/loanPersistence";
import { STATUS } from "@/lib/workflow";

import { useLendwise } from "../LendwiseProvider";
import StatusBadge from "../StatusBadge";

function short(a) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function GuarantorDashboard() {
  const { walletAddress, loanRequests, guarantorAccept, guarantorReject, badgeFor } = useLendwise();

  const me = normalizeAddr(walletAddress);
  const pending = loanRequests.filter(
    (l) => l.guarantor && l.guarantor === me && l.status === STATUS.AWAITING_GUARANTOR
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Guarantee requests</h2>
      {pending.length === 0 && <p className="text-slate-500">No pending guarantees.</p>}
      <ul className="space-y-4">
        {pending.map((loan) => (
          <li key={loan.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <StatusBadge label={badgeFor(loan.status)} />
            <p className="mt-3 text-sm text-slate-400">
              Borrower <span className="font-mono text-slate-200">{short(loan.borrower)}</span>
            </p>
            <p className="text-white">{loan.amount} POL — {loan.purpose}</p>
            <p className="mt-2 text-xs text-slate-500">Documents: {loan.documentsNote}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => guarantorAccept(loan.id)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Accept Guarantee
              </button>
              <button
                type="button"
                onClick={() => guarantorReject(loan.id)}
                className="rounded-xl border border-red-500/50 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
