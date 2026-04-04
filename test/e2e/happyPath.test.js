import { expect } from "chai";
import { network } from "hardhat";

function interestDue(principal, aprBps, termDays) {
  return (principal * BigInt(aprBps) * BigInt(termDays)) / (10000n * 365n);
}

async function deployAll(ethers) {
  const [deployer, borrower, lender, guarantor, v1, v2, v3] = await ethers.getSigners();
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
  return { deployer, usdc, did, rep, vault, factory, dao, borrower, lender, guarantor, v1, v2, v3 };
}

async function setupEligible(did, borrower, v1, v2, v3) {
  await did.connect(borrower).registerIdentity("QmBorrower");
  await did.connect(v1).addVouch(borrower.address);
  await did.connect(v2).addVouch(borrower.address);
  await did.connect(v3).addVouch(borrower.address);
}

describe("E2E lifecycle", function () {
  it("full repay path: deploy, DID, create, fund, activate, repay, reputation + lender balance", async function () {
    const { ethers } = await network.connect();
    const ctx = await deployAll(ethers);
    await setupEligible(ctx.did, ctx.borrower, ctx.v1, ctx.v2, ctx.v3);

    const principal = 1000n * 10n ** 6n;
    const apr = 1200;
    const term = 30;
    const didStr = "did:polygon:0xabc";

    await ctx.factory
      .connect(ctx.borrower)
      .createLoanRequest(principal, apr, term, ctx.guarantor.address, didStr);

    const stake = (principal * 1000n) / 10000n;
    await ctx.usdc.mint(ctx.lender.address, principal);
    await ctx.usdc.mint(ctx.guarantor.address, stake);
    await ctx.usdc.connect(ctx.lender).approve(await ctx.vault.getAddress(), principal);
    await ctx.usdc.connect(ctx.guarantor).approve(await ctx.vault.getAddress(), stake);
    await ctx.factory.connect(ctx.lender).fundLoan(1n);

    const loanAddr = await ctx.factory.getLoanAgreement(1n);
    const loan = await ethers.getContractAt("LoanAgreement", loanAddr);
    expect(await loan.state()).to.equal(0n);

    await loan.connect(ctx.lender).activateLoan();
    expect(await loan.state()).to.equal(1n);

    const int = interestDue(principal, apr, term);
    const totalDue = principal + int;
    await ctx.usdc.mint(ctx.borrower.address, totalDue);
    await ctx.usdc.connect(ctx.borrower).approve(await ctx.vault.getAddress(), totalDue);

    const lenderBefore = await ctx.usdc.balanceOf(ctx.lender.address);
    await loan.connect(ctx.borrower).makeRepayment(totalDue);
    expect(await loan.state()).to.equal(3n);

    expect(await ctx.rep.trustScoreOf(ctx.borrower.address)).to.equal(200n);

    const lenderAfter = await ctx.usdc.balanceOf(ctx.lender.address);
    expect(lenderAfter - lenderBefore).to.equal(totalDue);
  });

  it("default path: time travel, declareDefault, borrowerInDefault, guarantor slashed to lender", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployAll(ethers);
    await setupEligible(ctx.did, ctx.borrower, ctx.v1, ctx.v2, ctx.v3);

    const principal = 1000n * 10n ** 6n;
    await ctx.factory
      .connect(ctx.borrower)
      .createLoanRequest(principal, 1200, 30, ctx.guarantor.address, "QmDID");

    const stake = (principal * 1000n) / 10000n;
    await ctx.usdc.mint(ctx.lender.address, principal);
    await ctx.usdc.mint(ctx.guarantor.address, stake);
    await ctx.usdc.connect(ctx.lender).approve(await ctx.vault.getAddress(), principal);
    await ctx.usdc.connect(ctx.guarantor).approve(await ctx.vault.getAddress(), stake);
    await ctx.factory.connect(ctx.lender).fundLoan(1n);

    const loanAddr = await ctx.factory.getLoanAgreement(1n);
    const loan = await ethers.getContractAt("LoanAgreement", loanAddr);
    await loan.connect(ctx.lender).activateLoan();

    await networkHelpers.time.increase(30n * 24n * 60n * 60n + 7n * 24n * 60n * 60n + 1n);

    const lenderBefore = await ctx.usdc.balanceOf(ctx.lender.address);
    await loan.declareDefault();

    expect(await loan.state()).to.equal(4n);
    expect(await ctx.factory.borrowerInDefault(ctx.borrower.address)).to.equal(true);
    expect(await ctx.usdc.balanceOf(ctx.lender.address)).to.equal(lenderBefore + stake);
  });
});
