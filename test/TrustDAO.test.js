import { expect } from "chai";
import { network } from "hardhat";

async function deployProtocol(ethers) {
  const [deployer, borrower, lender, guarantor, v1, v2, v3, voter] = await ethers.getSigners();
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

  await did.connect(borrower).registerIdentity("QmBorrower");
  await did.connect(v1).addVouch(borrower.address);
  await did.connect(v2).addVouch(borrower.address);
  await did.connect(v3).addVouch(borrower.address);

  return { deployer, usdc, did, rep, vault, factory, dao, borrower, lender, guarantor, v1, v2, v3, voter };
}

describe("TrustDAO", function () {
  it("creates dispute, casts votes, and resolves after 72h", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
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
    await loan.declareDefault();

    await expect(ctx.dao.connect(ctx.borrower).createDispute(1n, "evidence"))
      .to.emit(ctx.dao, "DisputeCreated");

    await ctx.rep.connect(ctx.deployer).mintReputation(ctx.voter.address, 500n);

    await ctx.dao.connect(ctx.voter).castVote(1n, true);
    await expect(ctx.dao.connect(ctx.voter).castVote(1n, false)).to.be.revertedWithCustomError(
      ctx.dao,
      "AlreadyVoted",
    );

    await networkHelpers.time.increase(72n * 60n * 60n + 1n);
    await expect(ctx.dao.resolveDispute(1n)).to.emit(ctx.dao, "DisputeResolved");
    expect(await ctx.dao.getDisputeStatus(1n)).to.equal(2n); // BorrowerWon enum index
  });

  it("returns dispute status", async function () {
    const { ethers, networkHelpers } = await network.connect();
    const ctx = await deployProtocol(ethers);
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
    await loan.declareDefault();
    await ctx.dao.connect(ctx.borrower).createDispute(1n, "e");
    expect(await ctx.dao.getDisputeStatus(1n)).to.equal(1n); // Open
  });
});
