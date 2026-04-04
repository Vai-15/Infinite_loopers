import { useConnectModal } from "@rainbow-me/rainbowkit";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import { useAccount, useChainId, useDisconnect, useWalletClient } from "wagmi";

import { api } from "@/services/api";
import { buildContracts, getWalletTxCount } from "@/services/blockchain";
import { walletClientToSigner } from "@/lib/ethersAdapter";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const { address, isConnected, status } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainId();

  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({});
  const [txCount, setTxCount] = useState(0);
  const [error, setError] = useState("");

  const isConnecting = status === "connecting" || status === "reconnecting";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!walletClient || !address) {
        setSigner(null);
        setContracts({});
        return;
      }
      try {
        const s = await walletClientToSigner(walletClient);
        if (cancelled) return;
        setSigner(s);
        const built = buildContracts(s);
        setContracts(built);
        setError("");
        try {
          await api.registerUser({ wallet_address: address });
        } catch (e) {
          if (e?.response?.status !== 409) {
            console.warn("registerUser", e);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load contracts");
          setSigner(null);
          setContracts({});
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [walletClient, address]);

  const provider = useMemo(() => {
    if (typeof window === "undefined" || !window.ethereum || !address) {
      return null;
    }
    return new BrowserProvider(window.ethereum);
  }, [address]);

  const refreshOnchainStats = useCallback(async () => {
    if (!provider || !address) {
      setTxCount(0);
      return;
    }
    const count = await getWalletTxCount(provider, address);
    setTxCount(Number(count));
  }, [provider, address]);

  useEffect(() => {
    refreshOnchainStats();
  }, [refreshOnchainStats]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setSigner(null);
    setContracts({});
    setTxCount(0);
    setError("");
  }, [disconnect]);

  const connectWallet = useCallback(async () => {
    openConnectModal?.();
  }, [openConnectModal]);

  const account = address ?? "";

  const value = useMemo(
    () => ({
      account,
      provider,
      signer,
      chainId,
      txCount,
      isConnected,
      isConnecting,
      error,
      contracts,
      loanFactory: contracts.loanFactory,
      reputationNFT: contracts.reputationNFT,
      escrowVault: contracts.escrowVault,
      didRegistry: contracts.didRegistry,
      trustDAO: contracts.trustDAO,
      mockUSDC: contracts.mockUSDC,
      connectWallet,
      disconnectWallet,
      refreshOnchainStats
    }),
    [
      account,
      provider,
      signer,
      chainId,
      txCount,
      isConnected,
      isConnecting,
      error,
      contracts,
      connectWallet,
      disconnectWallet,
      refreshOnchainStats
    ]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
}
