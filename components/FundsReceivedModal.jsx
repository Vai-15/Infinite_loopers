"use client";

import { useLendwise } from "./LendwiseProvider";

export default function FundsReceivedModal() {
  const { fundsModal, walletAddress, loanRequests, borrowerCollectFunds, AMOY_EXPLORER, lastTxHash } =
    useLendwise();

  if (!fundsModal.open || !fundsModal.loanId) return null;
  const loan = loanRequests.find((l) => l.id === fundsModal.loanId);
  if (!loan || loan.borrower.toLowerCase() !== walletAddress.toLowerCase()) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-teal-500/30 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-teal-300">Funds received successfully</h3>
        <p className="mt-2 text-sm text-slate-300">
          The lender sent {loan.amount} POL to your wallet. Tx:{" "}
          {lastTxHash && (
            <a
              href={`${AMOY_EXPLORER}/tx/${lastTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-teal-400 underline"
            >
              {lastTxHash.slice(0, 10)}…
            </a>
          )}
        </p>
        <button
          type="button"
          onClick={() => borrowerCollectFunds(loan.id)}
          className="mt-6 w-full rounded-xl bg-teal-600 py-3 font-semibold text-white transition hover:bg-teal-500"
        >
          Collect Funds
        </button>
      </div>
    </div>
  );
}
