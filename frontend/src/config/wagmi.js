import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { hardhat, polygonAmoy } from "viem/chains";

const projectId = import.meta.env.VITE_WC_PROJECT_ID || "demo";

export const wagmiConfig = getDefaultConfig({
  appName: "DecentraLend",
  projectId,
  chains: [hardhat, polygonAmoy],
  ssr: false
});
