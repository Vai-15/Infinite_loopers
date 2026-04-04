import { useAccount } from "wagmi";

import { useWeb3 } from "@/context/Web3Context";

/**
 * Wagmi account + legacy ethers contract context (RainbowKit + ethers bridge).
 */
export function useContract() {
  const web3 = useWeb3();
  const { address, isConnected, status } = useAccount();

  return {
    ...web3,
    account: address ?? web3.account,
    isConnected: Boolean(isConnected),
    isConnecting: status === "connecting" || status === "reconnecting"
  };
}

export default useContract;
