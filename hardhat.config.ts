import "dotenv/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    mumbai: {
      type: "http",
      chainType: "generic",
      chainId: 80_001,
      url: configVariable("ALCHEMY_MUMBAI_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
    amoy: {
      type: "http",
      chainType: "generic",
      chainId: 80_002,
      url: "https://rpc-amoy.polygon.technology",
      accounts: [configVariable("PRIVATE_KEY")],
    },
    polygon: {
      type: "http",
      chainType: "generic",
      chainId: 137,
      url: configVariable("ALCHEMY_POLYGON_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("POLYGONSCAN_API_KEY"),
      // @ts-expect-error Hardhat runtime supports customChains for Polygonscan endpoints.
      customChains: [
        {
          network: "polygonMumbai",
          chainId: 80_001,
          urls: {
            apiURL: "https://api-testnet.polygonscan.com/api",
            browserURL: "https://mumbai.polygonscan.com",
          },
        },
        {
          network: "polygon",
          chainId: 137,
          urls: {
            apiURL: "https://api.polygonscan.com/api",
            browserURL: "https://polygonscan.com",
          },
        },
        {
          network: "amoy",
          chainId: 80_002,
          urls: {
            apiURL: "https://api-amoy.polygonscan.com/api",
            browserURL: "https://amoy.polygonscan.com",
          },
        },
      ],
    },
  },
});
