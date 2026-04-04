import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useWeb3 } from "@/context/Web3Context";
import { getCreditScore } from "@/services/api";

const CACHE_PREFIX = "decentralend_credit:";
const TTL_MS = 5 * 60 * 1000;

function readCache(wallet) {
  if (!wallet) return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + wallet.toLowerCase());
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    if (Date.now() - t > TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(wallet, data) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + wallet.toLowerCase(),
      JSON.stringify({ t: Date.now(), data })
    );
  } catch {
    /* ignore */
  }
}

async function fetchCreditScore(account, reputationNFT, provider) {
  if (!account) return null;

  const cached = readCache(account);
  if (cached) return cached;

  let onChain = 0;
  if (reputationNFT) {
    try {
      const raw = await reputationNFT.trustScoreOf(account);
      onChain = Number(raw);
    } catch {
      onChain = 0;
    }
  }

  let apiScore;
  if (onChain > 0) {
    const mapped = Math.min(850, Math.max(300, Math.round(300 + (onChain / 1000) * 550)));
    apiScore = {
      score: mapped,
      risk_level: mapped >= 720 ? "LOW" : mapped >= 580 ? "MEDIUM" : "HIGH",
      confidence: 0.9,
      top_factors: ["on_chain_reputation_nft"]
    };
  } else {
    const txCount = provider ? await provider.getTransactionCount(account) : 5;
    apiScore = await getCreditScore(account, {
      num_transactions: txCount,
      wallet_age_days: 400,
      repayment_rate: 0.7,
      community_vouches: 3
    });
  }

  writeCache(account, apiScore);
  return apiScore;
}

export function useCredit() {
  const { account, reputationNFT, provider } = useWeb3();
  const queryClient = useQueryClient();

  const nftKey = reputationNFT?.target ?? null;

  const query = useQuery({
    queryKey: ["credit", account, nftKey],
    queryFn: () => fetchCreditScore(account, reputationNFT, provider),
    enabled: Boolean(account),
    staleTime: TTL_MS
  });

  const scoreWallet = useCallback(
    async (walletAddress, features) => {
      const response = await getCreditScore(walletAddress, features || {});
      queryClient.setQueryData(["credit", walletAddress], response);
      writeCache(walletAddress, response);
      return response;
    },
    [queryClient]
  );

  const err = query.error;
  const errorMessage = query.isError
    ? err?.response?.data?.detail || err?.message || String(err)
    : "";

  return {
    data: query.data ?? null,
    loading: query.isLoading || query.isFetching,
    error: errorMessage,
    scoreWallet,
    refresh: query.refetch
  };
}

export default useCredit;
