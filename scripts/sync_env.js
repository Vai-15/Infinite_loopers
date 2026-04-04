import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const arg = process.argv[2] || "hardhat";
const depPath = join(root, "deployments", `${arg}.json`);

if (!existsSync(depPath)) {
  console.error("Missing deployment file:", depPath);
  process.exit(1);
}

const d = JSON.parse(readFileSync(depPath, "utf8"));

function setEnvBlock(text, updates) {
  let out = text;
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === "") continue;
    const re = new RegExp(`^${k}=.*$`, "m");
    const line = `${k}=${v}`;
    if (re.test(out)) {
      out = out.replace(re, line);
    } else {
      out = out.trimEnd() + `\n${line}\n`;
    }
  }
  return out;
}

const backendPath = join(root, "backend", ".env");
const frontendPath = join(root, "frontend", ".env");

const backendUpdates = {
  LOAN_FACTORY_ADDRESS: d.LoanFactory,
  REPUTATION_NFT_ADDRESS: d.ReputationNFT,
  ESCROW_VAULT_ADDRESS: d.EscrowVault,
  DID_REGISTRY_ADDRESS: d.DecentralizedID,
  TRUST_DAO_ADDRESS: d.TrustDAO,
  MOCK_USDC_ADDRESS: d.MockUSDC,
  WEB3_RPC_URL: d.chainId === "31337" ? "http://127.0.0.1:8545" : process.env.MUMBAI_RPC_URL || "",
};

const frontendUpdates = {
  VITE_LOAN_FACTORY: d.LoanFactory,
  VITE_REPUTATION_NFT: d.ReputationNFT,
  VITE_ESCROW_VAULT: d.EscrowVault,
  VITE_DID_REGISTRY: d.DecentralizedID,
  VITE_TRUST_DAO: d.TrustDAO,
  VITE_MOCK_USDC: d.MockUSDC,
  VITE_CHAIN_ID: d.chainId || "31337",
};

function mergeFile(path, updates) {
  const base = existsSync(path) ? readFileSync(path, "utf8") : "";
  const merged = setEnvBlock(base || "", updates);
  writeFileSync(path, merged.trim() + "\n", "utf8");
  console.log("Updated", path);
}

mergeFile(backendPath, backendUpdates);
mergeFile(frontendPath, frontendUpdates);
console.log("Synced from", depPath);
