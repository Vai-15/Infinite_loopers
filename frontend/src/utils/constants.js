export const ROUTES = {
  landing: "/",
  marketplace: "/marketplace",
  borrow: "/borrow",
  lend: "/lend",
  apply: "/apply",
  analytics: "/analytics",
  profile: "/profile",
  history: "/history"
};

export const STATUS_LABELS = {
  PENDING: "Pending",
  ACTIVE: "Active",
  REPAYING: "Repaying",
  COMPLETED: "Completed",
  DEFAULTED: "Defaulted"
};

export const CHAIN = {
  id: Number(import.meta.env.VITE_CHAIN_ID || 80002),
  rpcUrl: import.meta.env.VITE_CHAIN_RPC || "https://rpc-amoy.polygon.technology",
  name: import.meta.env.VITE_CHAIN_NAME || "Polygon Amoy"
};

export const CONTRACTS = {
  LOAN_FACTORY: import.meta.env.VITE_LOAN_FACTORY || "",
  REPUTATION_NFT: import.meta.env.VITE_REPUTATION_NFT || "",
  MOCK_USDC: import.meta.env.VITE_MOCK_USDC || ""
};
