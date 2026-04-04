import { useCallback, useEffect, useState } from "react";

import { useWeb3 } from "@/context/Web3Context";
import { getLoans } from "@/services/api";
import { formatAddress } from "@/utils/formatters";

export default function Dispute() {
  const { account, trustDAO, loanFactory } = useWeb3();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loanId, setLoanId] = useState("");
  const [evidence, setEvidence] = useState("");
  const [disputeId, setDisputeId] = useState("");
  const [supportBorrower, setSupportBorrower] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!account) {
      setLoans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await getLoans({ status: "DEFAULTED" });
      const mine = all.filter(
        (l) =>
          l.borrower_wallet?.toLowerCase() === account.toLowerCase() ||
          l.lender_wallet?.toLowerCase() === account.toLowerCase()
      );
      setLoans(mine);
    } catch {
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDispute() {
    if (!trustDAO || !loanId) return;
    setBusy(true);
    setMsg("");
    try {
      const tx = await trustDAO.createDispute(BigInt(loanId), evidence || "Evidence submitted via UI");
      const rec = await tx.wait();
      setMsg(`Dispute opened. Tx: ${rec.hash}`);
      await load();
    } catch (e) {
      setMsg(e?.shortMessage || e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function vote() {
    if (!trustDAO || !disputeId) return;
    setBusy(true);
    setMsg("");
    try {
      const tx = await trustDAO.castVote(BigInt(disputeId), supportBorrower);
      const rec = await tx.wait();
      setMsg(`Vote recorded. Tx: ${rec.hash}`);
    } catch (e) {
      setMsg(e?.shortMessage || e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function resolve() {
    if (!trustDAO || !disputeId) return;
    setBusy(true);
    setMsg("");
    try {
      const tx = await trustDAO.resolveDispute(BigInt(disputeId));
      const rec = await tx.wait();
      setMsg(`Resolved. Tx: ${rec.hash}`);
    } catch (e) {
      setMsg(e?.shortMessage || e?.message || "Failed (still in 72h window?)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text">TrustDAO Disputes</h1>
      <p className="text-sm text-text/70">
        Open disputes only after a loan is <strong>DEFAULTED</strong> on-chain. Voting uses your reputation NFT
        weight.
      </p>

      {loading ? (
        <p className="text-text/60">Loading your defaulted loans…</p>
      ) : (
        <ul className="space-y-2 rounded-2xl border border-white/10 bg-card/80 p-4 text-sm">
          {loans.length === 0 ? (
            <li className="text-text/60">No defaulted loans where you are borrower or lender.</li>
          ) : (
            loans.map((l) => (
              <li key={l.id} className="flex justify-between border-b border-white/5 py-2 last:border-0">
                <span>Loan #{l.id}</span>
                <span className="text-text/70">{formatAddress(l.borrower_wallet)}</span>
              </li>
            ))
          )}
        </ul>
      )}

      <section className="space-y-3 rounded-2xl border border-white/10 bg-card/80 p-4">
        <h2 className="font-semibold text-text">Open dispute</h2>
        <input
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
          placeholder="Loan ID"
          className="w-full rounded-xl border border-white/10 bg-dark px-3 py-2 text-text"
        />
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Evidence text"
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-dark px-3 py-2 text-text"
        />
        <button
          type="button"
          disabled={busy || !trustDAO || !loanFactory}
          onClick={openDispute}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Open Dispute
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-card/80 p-4">
        <h2 className="font-semibold text-text">Vote / resolve</h2>
        <input
          value={disputeId}
          onChange={(e) => setDisputeId(e.target.value)}
          placeholder="Dispute ID"
          className="w-full rounded-xl border border-white/10 bg-dark px-3 py-2 text-text"
        />
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={supportBorrower} onChange={(e) => setSupportBorrower(e.target.checked)} />
          Support borrower
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !trustDAO}
            onClick={vote}
            className="rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
          >
            Cast vote
          </button>
          <button
            type="button"
            disabled={busy || !trustDAO}
            onClick={resolve}
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Resolve (after 72h)
          </button>
        </div>
      </section>

      {msg && <p className="rounded-xl border border-white/10 bg-dark/50 p-3 text-sm text-sky-200">{msg}</p>}
    </main>
  );
}
