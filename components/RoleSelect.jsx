"use client";

import { useLendwise } from "./LendwiseProvider";

const ROLES = [
  { id: "borrower", title: "Borrower", desc: "Request loans & submit documents" },
  { id: "lender", title: "Lender", desc: "Review requests & fund approved loans" },
  { id: "guarantor", title: "Guarantor", desc: "Accept or reject guarantee requests" }
];

export default function RoleSelect() {
  const { selectRole } = useLendwise();
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-xl font-bold text-white">Choose your role</h2>
      <p className="mt-1 text-center text-sm text-slate-400">You can switch later by disconnecting</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => selectRole(r.id)}
            className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 text-left transition hover:border-teal-500/50 hover:bg-slate-800/80"
          >
            <p className="font-bold text-teal-400">{r.title}</p>
            <p className="mt-2 text-sm text-slate-400">{r.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
