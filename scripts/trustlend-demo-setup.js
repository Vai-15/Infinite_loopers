/**
 * TrustLend / Hardhat demo helper:
 * - Registers borrower DID + 3 vouches (isEligibleBorrower)
 * - Mints MockUSDC to lender & guarantor
 * - Approves EscrowVault for both (principal + 10% guarantor stake)
 *
 * Prerequisites: `npx hardhat node` then `npm run deploy:local` (or deploy to localhost).
 *
 * Run: npm run demo:trustlend --workspace Infinite_loopers
 *   or: npx hardhat run scripts/trustlend-demo-setup.js --network localhost
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";

const { ethers } = await network.connect();

const DID_ABI = [
  "function registerIdentity(string calldata ipfsCID) external",
  "function addVouch(address target) external",
  "function isEligibleBorrower(address user) external view returns (bool)",
];

const ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length < 7) {
    throw new Error("Need at least 7 Hardhat signers (borrower, lender, guarantor, 3 vouchers).");
  }

  const borrower = signers[1];
  const lender = signers[2];
  const guarantor = signers[3];
  const v1 = signers[4];
  const v2 = signers[5];
  const v3 = signers[6];

  const depPath = join(process.cwd(), "deployments", "hardhat.json");
  if (!existsSync(depPath)) {
    throw new Error("Missing deployments/hardhat.json — run: npm run deploy:local");
  }
  const dep = JSON.parse(readFileSync(depPath, "utf8"));
  const didAddr = dep.DecentralizedID;
  const usdcAddr = dep.MockUSDC;
  const vaultAddr = dep.EscrowVault;
  if (!didAddr || !usdcAddr || !vaultAddr) {
    throw new Error("deployment file missing DecentralizedID, MockUSDC, or EscrowVault");
  }

  const deployer = signers[0];
  const did = new ethers.Contract(didAddr, DID_ABI, borrower);
  const usdc = new ethers.Contract(usdcAddr, ERC20_ABI, deployer);

  console.log("Borrower (MetaMask import key #1):", borrower.address);
  console.log("Lender   (MetaMask import key #2):", lender.address);
  console.log("Guarantor (MetaMask import key #3):", guarantor.address);

  await did.registerIdentity("ipfs://QmTrustLendDemoBorrower");

  const didV1 = new ethers.Contract(didAddr, DID_ABI, v1);
  const didV2 = new ethers.Contract(didAddr, DID_ABI, v2);
  const didV3 = new ethers.Contract(didAddr, DID_ABI, v3);
  await didV1.addVouch(borrower.address);
  await didV2.addVouch(borrower.address);
  await didV3.addVouch(borrower.address);

  const eligible = await did.isEligibleBorrower(borrower.address);
  console.log("isEligibleBorrower(borrower):", eligible);

  const principal = ethers.parseUnits("500000", 6);
  const stake = (principal * 1000n) / 10000n;

  await usdc.mint(lender.address, principal * 3n);
  await usdc.mint(guarantor.address, stake * 3n);

  const usdcLender = new ethers.Contract(usdcAddr, ERC20_ABI, lender);
  const usdcGuarantor = new ethers.Contract(usdcAddr, ERC20_ABI, guarantor);
  await usdcLender.approve(vaultAddr, ethers.MaxUint256);
  await usdcGuarantor.approve(vaultAddr, ethers.MaxUint256);

  console.log("MockUSDC minted + vault approved for lender and guarantor.");
  console.log("Use the same chain (31337) and RPC http://127.0.0.1:8545 in MetaMask.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
