export const CONTRACT_ADDRESS =
    process.env.REACT_APP_TRUSTLEND_CONTRACT || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === "true";

export const SUPPORTED_CHAIN_IDS = [31337, 11155111];

export const CHAIN_CONFIGS = {
    31337: {
        chainId: "0x7A69",
        chainName: "Hardhat Localhost",
        nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18
        },
        rpcUrls: ["http://127.0.0.1:8545"],
        blockExplorerUrls: [""]
    },
    11155111: {
        chainId: "0xAA36A7",
        chainName: "Sepolia",
        nativeCurrency: {
            name: "Sepolia ETH",
            symbol: "ETH",
            decimals: 18
        },
        rpcUrls: [process.env.REACT_APP_SEPOLIA_RPC_URL || ""],
        blockExplorerUrls: ["https://sepolia.etherscan.io"]
    }
};

export const LOAN_STATUS = {
    0: "Open",
    1: "Funded",
    2: "Repaid",
    3: "Defaulted"
};

export const ETHERSCAN_TX_BASE = {
    11155111: "https://sepolia.etherscan.io/tx/"
};

export const LANDING_STATS = [
    { title: "Total Loans", value: "1,284" },
    { title: "Total ETH Lent", value: "4,920 ETH" },
    { title: "Active Borrowers", value: "387" },
    { title: "Avg Trust Score", value: "74" }
];

export const TRUSTLEND_CHART_COLORS = {
    primary: "#E94560",
    secondary: "#0F3460",
    tertiary: "#16213E",
    quaternary: "#335C81",
    axis: "#AAAAAA",
    grid: "#2A2A4A"
};
