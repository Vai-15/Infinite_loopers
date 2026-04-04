/**
 * Print Hardhat verify commands for TrustChain deployments.
 * Usage: node scripts/verify.js [deployments/hardhat.json]
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const file = process.argv[2] ?? join(process.cwd(), "deployments", "hardhat.json");

if (!existsSync(file)) {
  console.error("Missing deployment file:", file);
  process.exit(1);
}

const d = JSON.parse(readFileSync(file, "utf8"));
const net = d.network === "mumbai" ? "mumbai" : "hardhat";

console.log("# Verify on Polygonscan (Mumbai) — adjust constructor args per contract.\n");
console.log(`npx hardhat verify --network ${net} ${d.MockUSDC}`);
console.log(`npx hardhat verify --network ${net} ${d.DecentralizedID} "${d.deployer}"`);
console.log(`npx hardhat verify --network ${net} ${d.ReputationNFT} "${d.deployer}"`);
console.log(
  `npx hardhat verify --network ${net} ${d.EscrowVault} "${d.MockUSDC}" "${d.deployer}"`,
);
console.log(
  `npx hardhat verify --network ${net} ${d.LoanFactory} "${d.DecentralizedID}" "${d.ReputationNFT}" "${d.EscrowVault}" "${d.MockUSDC}" "${d.deployer}"`,
);
console.log(
  `npx hardhat verify --network ${net} ${d.TrustDAO} "${d.ReputationNFT}" "${d.LoanFactory}"`,
);
