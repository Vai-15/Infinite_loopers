import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

function interestDue(principal, aprBps, termDays) {
  return (principal * BigInt(aprBps) * BigInt(termDays)) / (10000n * 365n);
}

async function main() {
  const [deployer, borrower, lender, guarantor, v1, v2, v3] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const usdcF = await ethers.getContractFactory("MockUSDC");
  const usdc = await usdcF.deploy();
  await usdc.waitForDeployment();
  const didF = await ethers.getContractFactory("DecentralizedID");
  const did = await didF.deploy(deployer.address);
  await did.waitForDeployment();
  const repF = await ethers.getContractFactory("ReputationNFT");
  const rep = await repF.deploy(deployer.address);
  await rep.waitForDeployment();
  const vF = await ethers.getContractFactory("EscrowVault");
  const vault = await vF.deploy(await usdc.getAddress(), deployer.address);
  await vault.waitForDeployment();
  const ff = await ethers.getContractFactory("LoanFactory");
  const factory = await ff.deploy(
    await did.getAddress(),
    await rep.getAddress(),
    await vault.getAddress(),
    await usdc.getAddress(),
    deployer.address,
  );
  await factory.waitForDeployment();
  const dF = await ethers.getContractFactory("TrustDAO");
  const dao = await dF.deploy(await rep.getAddress(), await factory.getAddress());
  await dao.waitForDeployment();
  await factory.setTrustDAO(await dao.getAddress());
  await rep.setAuthorized(await factory.getAddress(), true);
  await rep.setAuthorized(await vault.getAddress(), true);
  await vault.setLoanFactory(await factory.getAddress());

  const tenThousand = 10_000n * 10n ** 6n;
  const oneThousand = 1_000n * 10n ** 6n;
  await usdc.mint(lender.address, tenThousand);
  await usdc.mint(guarantor.address, oneThousand);
  console.log("Minted 10_000 USDC to lender, 1_000 to guarantor");

  await did.connect(borrower).registerIdentity("QmSeedBorrowerDID");
  await did.connect(v1).addVouch(borrower.address);
  await did.connect(v2).addVouch(borrower.address);
  await did.connect(v3).addVouch(borrower.address);
  console.log("Borrower DID + 3 vouches");

  const principal = 100n * 10n ** 6n;
  const apr = 800;
  const termDays = 30;
  await factory.connect(borrower).createLoanRequest(principal, apr, termDays, guarantor.address, "QmSeedBorrowerDID");
  const stake = (principal * 1000n) / 10000n;
  await usdc.connect(lender).approve(await vault.getAddress(), principal);
  await usdc.connect(guarantor).approve(await vault.getAddress(), stake);
  await factory.connect(lender).fundLoan(1n);
  console.log("Loan 1 funded");

  const loanAddr = await factory.getLoanAgreement(1n);
  const loan = await ethers.getContractAt("LoanAgreement", loanAddr);
  await loan.connect(lender).activateLoan();
  console.log("Loan activated / principal released to borrower");

  const int = interestDue(principal, apr, termDays);
  const total = principal + int;
  await usdc.mint(borrower.address, total);
  await usdc.connect(borrower).approve(await vault.getAddress(), total);

  await networkHelpers.time.increase(30n * 24n * 60n * 60n);
  console.log("Fast-forwarded 30 days");

  await loan.connect(borrower).makeRepayment(total);
  const score = await rep.trustScoreOf(borrower.address);
  console.log("Repaid; borrower trust score:", score.toString());

  console.log("\n--- TrustChain seed summary ---");
  console.log({
    mockUSDC: await usdc.getAddress(),
    loanFactory: await factory.getAddress(),
    loan1: loanAddr,
    borrowerTrustScore: score.toString(),
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
