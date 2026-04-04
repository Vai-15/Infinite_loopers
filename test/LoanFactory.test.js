import { expect } from "chai";
import { network } from "hardhat";

function interestDue(principal, aprBps, termDays) {
  return (principal * BigInt(aprBps) * BigInt(termDays)) / (10000n * 365n);
}

async function deployProtocol(ethers) {
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

async function setupEligibleBorrower(did, borrower, v1, v2, v3) {
  await did.connect(borrower).registerIdentity("QmBorrower");
  await did.connect(v1).addVouch(borrower.address);
  await did.connect(v2).addVouch(borrower.address);
  await did.connect(v3).addVouch(borrower.address);
}

describe("LoanFactory", function () {
  it("reverts if borrower has no DID", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
    await expect(
      ctx.factory.connect(ctx.borrower).createLoanRequest(100e6, 800, 30, ctx.guarantor.address, "QmX"),
    ).to.be.revertedWithCustomError(ctx.factory, "NotEligible");
  });

  it("reverts if borrower has fewer than 3 vouches", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
    await ctx.did.connect(ctx.borrower).registerIdentity("QmB");
    await ctx.did.connect(ctx.v1).addVouch(ctx.borrower.address);
    await ctx.did.connect(ctx.v2).addVouch(ctx.borrower.address);
    await expect(
      ctx.factory.connect(ctx.borrower).createLoanRequest(100e6, 800, 30, ctx.guarantor.address, "QmB"),
    ).to.be.revertedWithCustomError(ctx.factory, "NotEligible");
  });

  it("creates loan and emits LoanRequested", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
    await setupEligibleBorrower(ctx.did, ctx.borrower, ctx.v1, ctx.v2, ctx.v3);
    await expect(
      ctx.factory.connect(ctx.borrower).createLoanRequest(100e6, 800, 30, ctx.guarantor.address, "QmB"),
    )
      .to.emit(ctx.factory, "LoanRequested")
      .withArgs(1n, ctx.borrower.address, 100000000n, 800n, 30n, ctx.guarantor.address);
  });

  it("allows lender to fund loan", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
    await setupEligibleBorrower(ctx.did, ctx.borrower, ctx.v1, ctx.v2, ctx.v3);
    await ctx.factory.connect(ctx.borrower).createLoanRequest(100e6, 800, 30, ctx.guarantor.address, "QmB");
    const principal = 100000000n;
    const stake = (principal * 1000n) / 10000n;
    await ctx.usdc.mint(ctx.lender.address, principal);
    await ctx.usdc.mint(ctx.guarantor.address, stake);
    await ctx.usdc.connect(ctx.lender).approve(await ctx.vault.getAddress(), principal);
    await ctx.usdc.connect(ctx.guarantor).approve(await ctx.vault.getAddress(), stake);
    await expect(ctx.factory.connect(ctx.lender).fundLoan(1n)).to.emit(ctx.factory, "LoanFunded");
  });

  it("completes loan after full repayment", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
    await setupEligibleBorrower(ctx.did, ctx.borrower, ctx.v1, ctx.v2, ctx.v3);
    const principal = 100000000n;
    const apr = 800;
    const term = 30;
    await ctx.factory.connect(ctx.borrower).createLoanRequest(principal, apr, term, ctx.guarantor.address, "QmB");
    const stake = (principal * 1000n) / 10000n;
    await ctx.usdc.mint(ctx.lender.address, principal);
    await ctx.usdc.mint(ctx.guarantor.address, stake);
    await ctx.usdc.connect(ctx.lender).approve(await ctx.vault.getAddress(), principal);
    await ctx.usdc.connect(ctx.guarantor).approve(await ctx.vault.getAddress(), stake);
    await ctx.factory.connect(ctx.lender).fundLoan(1n);

    const loanAddr = await ctx.factory.getLoanAgreement(1n);
    const loan = await ethers.getContractAt("LoanAgreement", loanAddr);
    await loan.connect(ctx.lender).activateLoan();
    const int = interestDue(principal, apr, term);
    const total = principal + int;
    await ctx.usdc.mint(ctx.borrower.address, total);
    await ctx.usdc.connect(ctx.borrower).approve(await ctx.vault.getAddress(), total);
    await expect(loan.connect(ctx.borrower).makeRepayment(total)).to.emit(ctx.factory, "LoanCompleted");
    expect(await ctx.rep.trustScoreOf(ctx.borrower.address)).to.equal(200n);
  });

  it("declares default after due date and grace period", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
    await setupEligibleBorrower(ctx.did, ctx.borrower, ctx.v1, ctx.v2, ctx.v3);
    const principal = 100000000n;
    await ctx.factory.connect(ctx.borrower).createLoanRequest(principal, 800, 30, ctx.guarantor.address, "QmB");
    const stake = (principal * 1000n) / 10000n;
    await ctx.usdc.mint(ctx.lender.address, principal);
    await ctx.usdc.mint(ctx.guarantor.address, stake);
    await ctx.usdc.connect(ctx.lender).approve(await ctx.vault.getAddress(), principal);
    await ctx.usdc.connect(ctx.guarantor).approve(await ctx.vault.getAddress(), stake);
    await ctx.factory.connect(ctx.lender).fundLoan(1n);
    const loanAddr = await ctx.factory.getLoanAgreement(1n);
    const loan = await ethers.getContractAt("LoanAgreement", loanAddr);
    await loan.connect(ctx.lender).activateLoan();

    const seven = 7n * 24n * 60n * 60n;
    const thirty = 30n * 24n * 60n * 60n;
    await networkHelpers.time.increase(thirty + seven + 1n);

    await expect(loan.declareDefault()).to.emit(ctx.factory, "LoanDefaulted");
    expect(await ctx.factory.borrowerInDefault(ctx.borrower.address)).to.equal(true);
  });

  it("slashes guarantor on default", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
    await setupEligibleBorrower(ctx.did, ctx.borrower, ctx.v1, ctx.v2, ctx.v3);
    const principal = 100000000n;
    const stake = (principal * 1000n) / 10000n;
    await ctx.factory.connect(ctx.borrower).createLoanRequest(principal, 800, 30, ctx.guarantor.address, "QmB");
    await ctx.usdc.mint(ctx.lender.address, principal);
    await ctx.usdc.mint(ctx.guarantor.address, stake);
    await ctx.usdc.connect(ctx.lender).approve(await ctx.vault.getAddress(), principal);
    await ctx.usdc.connect(ctx.guarantor).approve(await ctx.vault.getAddress(), stake);
    await ctx.factory.connect(ctx.lender).fundLoan(1n);
    const loanAddr = await ctx.factory.getLoanAgreement(1n);
    const loan = await ethers.getContractAt("LoanAgreement", loanAddr);
    await loan.connect(ctx.lender).activateLoan();
    await networkHelpers.time.increase(30n * 24n * 60n * 60n + 7n * 24n * 60n * 60n + 1n);
    const before = await ctx.usdc.balanceOf(ctx.lender.address);
    await loan.declareDefault();
    expect(await ctx.usdc.balanceOf(ctx.lender.address)).to.equal(before + stake);
  });
});
