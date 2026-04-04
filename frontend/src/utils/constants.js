export const ROUTES = {
  landing: "/",
  marketplace: "/marketplace",
  dashboard: "/dashboard",
  borrow: "/borrow",
  lend: "/lend",
  apply: "/apply",
  analytics: "/analytics",
  profile: "/profile",
  history: "/history",
  dispute: "/dispute"
};

export const STATUS_LABELS = {
  PENDING: "Pending",
  FUNDED_PENDING_ACTIVATION: "Funded (activate)",
  ACTIVE: "Active",
  REPAYING: "Repaying",
  COMPLETED: "Completed",
  DEFAULTED: "Defaulted"
};

export const CHAIN = {
  id: Number(import.meta.env.VITE_CHAIN_ID || 31337),
  rpcUrl: import.meta.env.VITE_CHAIN_RPC || "http://127.0.0.1:8545",
  name: import.meta.env.VITE_CHAIN_NAME || "Hardhat Local"
};

export const CONTRACTS = {
  LOAN_FACTORY: import.meta.env.VITE_LOAN_FACTORY || "",
  REPUTATION_NFT: import.meta.env.VITE_REPUTATION_NFT || "",
  ESCROW_VAULT: import.meta.env.VITE_ESCROW_VAULT || "",
  DID_REGISTRY: import.meta.env.VITE_DID_REGISTRY || "",
  TRUST_DAO: import.meta.env.VITE_TRUST_DAO || "",
  MOCK_USDC: import.meta.env.VITE_MOCK_USDC || ""
};
