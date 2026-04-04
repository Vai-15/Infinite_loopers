import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  connectWallet,
  getConnectedAccounts,
  getLoanFactoryContract,
  getWalletTxCount,
  switchToTargetChain
} from "@/services/blockchain";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [txCount, setTxCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  const disconnectWallet = useCallback(() => {
    setAccount("");
    setProvider(null);
    setSigner(null);
    setContract(null);
    setChainId(null);
    setTxCount(0);
    setIsConnected(false);
    setError("");
  }, []);

  const refreshOnchainStats = useCallback(async () => {
    if (!provider || !account) {
      setTxCount(0);
      return;
    }
    const count = await getWalletTxCount(provider, account);
    setTxCount(Number(count));
  }, [provider, account]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError("");
    try {
      await switchToTargetChain();
      const session = await connectWallet();
      setAccount(session.account);
      setProvider(session.provider);
      setSigner(session.signer);
      setChainId(session.chainId);
      setContract(getLoanFactoryContract(session.signer));
      setIsConnected(Boolean(session.account));
      return session;
    } catch (err) {
      setError(err?.message || "Unable to connect wallet");
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    async function restore() {
      const accounts = await getConnectedAccounts();
      if (accounts.length > 0) {
        try {
          await connect();
        } catch {
          disconnectWallet();
        }
      }
    }

    restore();
  }, [connect, disconnectWallet]);

  useEffect(() => {
    refreshOnchainStats();
  }, [refreshOnchainStats]);

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    const onAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
        return;
      }
      await connect();
    };

    const onChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [connect, disconnectWallet]);

  const value = useMemo(
    () => ({
      account,
      provider,
      signer,
      contract,
      chainId,
      txCount,
      isConnected,
      isConnecting,
      error,
      connectWallet: connect,
      disconnectWallet,
      refreshOnchainStats
    }),
    [
      account,
      provider,
      signer,
      contract,
      chainId,
      txCount,
      isConnected,
      isConnecting,
      error,
      connect,
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
