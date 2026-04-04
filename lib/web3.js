import { isAddress, parseEther } from "ethers";

export const AMOY_CHAIN_ID_HEX = "0x13882";
export const AMOY_CHAIN_ID_DEC = 80002;
export const AMOY_RPC = "https://rpc-amoy.polygon.technology";
export const AMOY_EXPLORER = "https://amoy.polygonscan.com";

/** True for MetaMask specifically */
export function hasMetaMask() {
  return typeof window !== "undefined" && window.ethereum?.isMetaMask === true;
}

/** Any EIP-1193 injector (MetaMask, Rabby, Brave, some Coinbase modes, etc.) */
export function hasBrowserWallet() {
  return typeof window !== "undefined" && !!window.ethereum;
}

export async function getChainId() {
  if (!window.ethereum) return null;
  const hex = await window.ethereum.request({ method: "eth_chainId" });
  return Number.parseInt(hex, 16);
}

export async function ensurePolygonAmoy() {
  const eth = window.ethereum;
  if (!eth) throw new Error("MetaMask not available");

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AMOY_CHAIN_ID_HEX }]
    });
  } catch (e) {
    if (e?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: AMOY_CHAIN_ID_HEX,
            chainName: "Polygon Amoy",
            nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
            rpcUrls: [AMOY_RPC],
            blockExplorerUrls: [AMOY_EXPLORER]
          }
        ]
      });
    } else if (e?.code === 4001) {
      throw new Error("You rejected switching to Polygon Amoy.");
    } else {
      throw e;
    }
  }

  const id = await getChainId();
  if (id !== AMOY_CHAIN_ID_DEC) throw new Error("Wrong network. Use Polygon Amoy (80002).");
}

export async function connectMetaMask() {
  if (!hasBrowserWallet()) throw new Error("No crypto wallet found. Install MetaMask or use a Web3 browser.");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("No account returned.");
  await ensurePolygonAmoy();
  return accounts[0];
}

export function validateAddress(addr) {
  const a = String(addr || "").trim();
  if (!a) return { ok: false, error: "Address required." };
  if (!isAddress(a)) return { ok: false, error: "Invalid wallet address." };
  return { ok: true, address: a };
}

function toHexWei(wei) {
  return `0x${wei.toString(16)}`;
}

export async function sendNativePol({ from, to, amountPol }) {
  const eth = window.ethereum;
  if (!eth) throw new Error("MetaMask not installed.");
  const id = await getChainId();
  if (id !== AMOY_CHAIN_ID_DEC) throw new Error("Wrong network. Switch to Polygon Amoy.");

  const v = validateAddress(to);
  if (!v.ok) throw new Error(v.error);

  let wei;
  try {
    wei = parseEther(String(amountPol));
  } catch {
    throw new Error("Invalid POL amount.");
  }

  return eth.request({
    method: "eth_sendTransaction",
    params: [{ from, to: v.address, value: toHexWei(wei) }]
  });
}
