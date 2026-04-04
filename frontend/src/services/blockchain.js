import { BrowserProvider, Contract } from "ethers";

import { CHAIN, CONTRACTS } from "@/utils/constants";
import DecentralizedIDAbi from "@/abis/DecentralizedID.json";
import EscrowVaultAbi from "@/abis/EscrowVault.json";
import LoanAgreementAbi from "@/abis/LoanAgreement.json";
import LoanFactoryAbi from "@/abis/LoanFactory.json";
import MockUSDCAbi from "@/abis/MockUSDC.json";
import ReputationNFTAbi from "@/abis/ReputationNFT.json";
import TrustDAOAbi from "@/abis/TrustDAO.json";

function pickAbi(artifact) {
  return artifact?.abi ?? artifact;
}

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
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [CHAIN.rpcUrl],
            blockExplorerUrls: []
          }
        ]
      });
    } else {
      throw error;
    }
  }
}

export function buildContracts(signerOrProvider) {
  const c = {};
  if (CONTRACTS.LOAN_FACTORY) {
    c.loanFactory = new Contract(CONTRACTS.LOAN_FACTORY, pickAbi(LoanFactoryAbi), signerOrProvider);
  }
  if (CONTRACTS.REPUTATION_NFT) {
    c.reputationNFT = new Contract(CONTRACTS.REPUTATION_NFT, pickAbi(ReputationNFTAbi), signerOrProvider);
  }
  if (CONTRACTS.ESCROW_VAULT) {
    c.escrowVault = new Contract(CONTRACTS.ESCROW_VAULT, pickAbi(EscrowVaultAbi), signerOrProvider);
  }
  if (CONTRACTS.DID_REGISTRY) {
    c.didRegistry = new Contract(CONTRACTS.DID_REGISTRY, pickAbi(DecentralizedIDAbi), signerOrProvider);
  }
  if (CONTRACTS.TRUST_DAO) {
    c.trustDAO = new Contract(CONTRACTS.TRUST_DAO, pickAbi(TrustDAOAbi), signerOrProvider);
  }
  if (CONTRACTS.MOCK_USDC) {
    c.mockUSDC = new Contract(CONTRACTS.MOCK_USDC, pickAbi(MockUSDCAbi), signerOrProvider);
  }
  return c;
}

export function getLoanFactoryContract(providerOrSigner) {
  if (!CONTRACTS.LOAN_FACTORY) return null;
  return new Contract(CONTRACTS.LOAN_FACTORY, pickAbi(LoanFactoryAbi), providerOrSigner);
}

export async function getLoanAgreementContract(factory, loanId, signerOrProvider) {
  const addr = await factory.getLoanAgreement(loanId);
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return null;
  return new Contract(addr, pickAbi(LoanAgreementAbi), signerOrProvider);
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
