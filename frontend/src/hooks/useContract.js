import { useWeb3 } from "@/context/Web3Context";

export function useContract() {
  return useWeb3();
}

export default useContract;
