import { BrowserProvider } from "ethers";

function accountAddress(account) {
  if (!account) return null;
  return typeof account === "string" ? account : account.address;
}

/**
 * Bridge viem WalletClient → ethers v6 JsonRpcSigner (injected / WC).
 */
export async function walletClientToSigner(walletClient) {
  if (!walletClient) return null;
  const address = accountAddress(walletClient.account);
  if (!address) return null;

  const ethereum = typeof window !== "undefined" ? window.ethereum : null;
  if (ethereum) {
    const provider = new BrowserProvider(ethereum);
    return provider.getSigner(address);
  }

  const { chain, transport } = walletClient;
  const network = chain
    ? { chainId: chain.id, name: chain.name, ensAddress: chain.contracts?.ensRegistry?.address }
    : undefined;
  const provider = new BrowserProvider(transport, network);
  return provider.getSigner(address);
}
