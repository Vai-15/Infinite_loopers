import { useEffect, useState } from "react";

import CommunityVouch from "@/components/CommunityVouch";
import CreditGauge from "@/components/CreditGauge";
import Skeleton from "@/components/ui/Skeleton";
import VouchCard from "@/components/VouchCard";
import { useWeb3 } from "@/context/Web3Context";
import { useCredit } from "@/hooks/useCredit";
import { api } from "@/services/api";
import { formatDate, formatStatus } from "@/utils/formatters";

export default function Profile() {
  const { account, isConnected, reputationNFT } = useWeb3();
  const { data: creditResult, scoreWallet, loading: scoring } = useCredit();
  const [user, setUser] = useState(null);
  const [vouches, setVouches] = useState([]);
  const [history, setHistory] = useState([]);
  const [nftUri, setNftUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [vouchTick, setVouchTick] = useState(0);

  useEffect(() => {
    async function load() {
      if (!isConnected || !account) {
        setUser(null);
        setVouches([]);
        setLoading(false);
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
        try {
          const hist = await api.getUserHistory(account);
          setHistory(hist || []);
        } catch {
          setHistory([]);
        }
        if (reputationNFT) {
          try {
            const tid = await reputationNFT.tokenIdOf(account);
            if (tid && tid !== 0n) {
              const uri = await reputationNFT.uri(tid);
              setNftUri(uri || "");
            } else {
              setNftUri("");
            }
          } catch {
            setNftUri("");
          }
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [account, isConnected, reputationNFT, vouchTick]);

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

  if (isConnected && loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-white/10 bg-card/80 p-6">
          <Skeleton className="mb-3 h-8 w-48" />
          <Skeleton className="mb-2 h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-2/3 max-w-sm" />
          <Skeleton className="mt-4 h-10 w-40" />
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </section>
      </main>
    );
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
        <CommunityVouch
          borrowerWallet={account}
          voucherWallet={account}
          onUpdated={() => setVouchTick((t) => t + 1)}
        />
      </section>

      {nftUri && (
        <section className="rounded-2xl border border-white/10 bg-card/80 p-4">
          <h2 className="mb-2 text-lg font-semibold text-text">Reputation SBT</h2>
          <img src={nftUri} alt="Reputation badge" className="max-h-40 rounded-lg border border-white/10" />
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-card/80 p-4">
        <h2 className="mb-3 text-lg font-semibold text-text">Loan history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-text/60">No loans yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 border-b border-white/5 py-2">
                <span>#{l.id}</span>
                <span className={formatStatus(l.status).color}>{formatStatus(l.status).label}</span>
                <span className="text-text/70">{formatDate(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
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
