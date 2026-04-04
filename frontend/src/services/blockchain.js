import { BrowserProvider, Contract } from "ethers";

import { CHAIN, CONTRACTS } from "@/utils/constants";
import LoanFactoryAbi from "@/abis/LoanFactory.json";

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is required to connect wallet.");
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    account: accounts?.[0] || "",
    chainId: Number(network.chainId)
  };
}

export async function getConnectedAccounts() {
  if (!window.ethereum) {
    return [];
  }
  return window.ethereum.request({ method: "eth_accounts" });
}

export async function switchToTargetChain() {
  if (!window.ethereum) {
    return;
  }

  const chainHex = `0x${CHAIN.id.toString(16)}`;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }]
    });
  } catch (error) {
    if (error?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainHex,
            chainName: CHAIN.name,
            nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
            rpcUrls: [CHAIN.rpcUrl],
            blockExplorerUrls: ["https://amoy.polygonscan.com"]
          }
        ]
      });
    } else {
      throw error;
    }
  }
}

export function getLoanFactoryContract(providerOrSigner) {
  if (!CONTRACTS.LOAN_FACTORY) {
    return null;
  }

  const artifact = LoanFactoryAbi?.abi ? LoanFactoryAbi.abi : LoanFactoryAbi;
  return new Contract(CONTRACTS.LOAN_FACTORY, artifact, providerOrSigner);
}

export async function getWalletTxCount(provider, walletAddress) {
  if (!provider || !walletAddress) {
    return 0;
  }
  try {
    return await provider.getTransactionCount(walletAddress);
  } catch {
    return 0;
  }
}
