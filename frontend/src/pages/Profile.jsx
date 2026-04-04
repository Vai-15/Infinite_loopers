import { useEffect, useState } from "react";

import CreditGauge from "@/components/CreditGauge";
import VouchCard from "@/components/VouchCard";
import { useContract } from "@/hooks/useContract";
import { useCredit } from "@/hooks/useCredit";
import { api } from "@/services/api";

export default function Profile() {
  const { account, isConnected } = useContract();
  const { data: creditResult, scoreWallet, loading: scoring } = useCredit();
  const [user, setUser] = useState(null);
  const [vouches, setVouches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!isConnected || !account) {
        setUser(null);
        setVouches([]);
        return;
      }

      setLoading(true);
      try {
        let profile;
        try {
          profile = await api.getUser(account);
        } catch {
          profile = await api.registerUser({ wallet_address: account });
        }

        setUser(profile);
        const borrowerVouches = await api.getVouches(account);
        setVouches(borrowerVouches || []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [account, isConnected]);

  async function handleScore() {
    if (!account) return;
    await scoreWallet(account, {
      wallet_age_days: 400,
      num_transactions: 75,
      avg_tx_value_usd: 160,
      num_previous_loans: 3,
      repayment_rate: 0.88,
      default_count: 0,
      community_vouches: vouches.length,
      monthly_income_usd: 2800,
      days_employed: 1200
    });
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-white/10 bg-card/80 p-6">
        <h1 className="text-2xl font-bold text-text">Your Profile</h1>
        <p className="mt-2 text-sm text-text/70">Wallet: {account || "Connect wallet"}</p>
        <p className="text-sm text-text/70">DID: {user?.did || "Not registered"}</p>
        <button
          type="button"
          onClick={handleScore}
          disabled={!account || scoring || loading}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {scoring ? "Scoring..." : "Refresh Credit Score"}
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <CreditGauge score={creditResult?.score || user?.credit_score || 300} />
        <article className="rounded-2xl border border-white/10 bg-card/80 p-6">
          <h2 className="text-lg font-semibold text-text">Community Vouches</h2>
          <p className="mt-2 text-sm text-text/70">Total vouches: {vouches.length}</p>
        </article>
      </section>

      {vouches.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vouches.map((vouch) => (
            <VouchCard
              key={vouch.id}
              voucherWallet={vouch.voucher_wallet}
              borrowerWallet={vouch.borrower_wallet}
              amountUsdc={vouch.amount_usdc}
              loanId={vouch.loan_id}
            />
          ))}
        </section>
      )}
    </main>
  );
}
