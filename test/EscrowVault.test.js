import { expect } from "chai";
import { network } from "hardhat";

describe("EscrowVault", function () {
  it("holds funds after deposit", async function () {
    const { ethers } = await network.connect();
    const [owner, lender, guarantor, borrower] = await ethers.getSigners();
    const usdcF = await ethers.getContractFactory("MockUSDC");
    const usdc = await usdcF.deploy();
    await usdc.waitForDeployment();
    const vF = await ethers.getContractFactory("EscrowVault");
    const vault = await vF.deploy(await usdc.getAddress(), owner.address);
    await vault.waitForDeployment();
    const hF = await ethers.getContractFactory("EscrowHarness");
    const harness = await hF.deploy(await vault.getAddress());
    await harness.waitForDeployment();
    await vault.setLoanFactory(await harness.getAddress());

    const mockF = await ethers.getContractFactory("LoanAgreementMock");
    const mock = await mockF.deploy(await vault.getAddress());
    await mock.waitForDeployment();

    const principal = 100n * 10n ** 6n;
    const stake = 10n * 10n ** 6n;
    await usdc.mint(lender.address, principal);
    await usdc.mint(guarantor.address, stake);
    await usdc.connect(lender).approve(await vault.getAddress(), principal);
    await usdc.connect(guarantor).approve(await vault.getAddress(), stake);

    await harness.registerAndFund(
      1n,
      await mock.getAddress(),
      lender.address,
      guarantor.address,
      principal,
      stake,
    );

    expect(await usdc.balanceOf(await vault.getAddress())).to.equal(principal + stake);
  });

  it("releases funds to borrower on activation", async function () {
    const { ethers } = await network.connect();
    const [owner, lender, guarantor, borrower] = await ethers.getSigners();
    const usdcF = await ethers.getContractFactory("MockUSDC");
    const usdc = await usdcF.deploy();
    await usdc.waitForDeployment();
    const vF = await ethers.getContractFactory("EscrowVault");
    const vault = await vF.deploy(await usdc.getAddress(), owner.address);
    await vault.waitForDeployment();
    const hF = await ethers.getContractFactory("EscrowHarness");
    const harness = await hF.deploy(await vault.getAddress());
    await harness.waitForDeployment();
    await vault.setLoanFactory(await harness.getAddress());
    const mockF = await ethers.getContractFactory("LoanAgreementMock");
    const mock = await mockF.deploy(await vault.getAddress());
    await mock.waitForDeployment();

    const principal = 50n * 10n ** 6n;
    const stake = 5n * 10n ** 6n;
    await usdc.mint(lender.address, principal);
    await usdc.mint(guarantor.address, stake);
    await usdc.connect(lender).approve(await vault.getAddress(), principal);
    await usdc.connect(guarantor).approve(await vault.getAddress(), stake);
    await harness.registerAndFund(
      2n,
      await mock.getAddress(),
      lender.address,
      guarantor.address,
      principal,
      stake,
    );

    await mock.releaseFunds(2n, borrower.address, principal);
    expect(await usdc.balanceOf(borrower.address)).to.equal(principal);
  });

  it("processes partial repayments", async function () {
    const { ethers } = await network.connect();
    const [owner, lender, guarantor, borrower] = await ethers.getSigners();
    const usdcF = await ethers.getContractFactory("MockUSDC");
    const usdc = await usdcF.deploy();
    await usdc.waitForDeployment();
    const vF = await ethers.getContractFactory("EscrowVault");
    const vault = await vF.deploy(await usdc.getAddress(), owner.address);
    await vault.waitForDeployment();
    const hF = await ethers.getContractFactory("EscrowHarness");
    const harness = await hF.deploy(await vault.getAddress());
    await harness.waitForDeployment();
    await vault.setLoanFactory(await harness.getAddress());
    const mockF = await ethers.getContractFactory("LoanAgreementMock");
    const mock = await mockF.deploy(await vault.getAddress());
    await mock.waitForDeployment();

    const principal = 100n * 10n ** 6n;
    const stake = 10n * 10n ** 6n;
    await usdc.mint(lender.address, principal);
    await usdc.mint(guarantor.address, stake);
    await usdc.connect(lender).approve(await vault.getAddress(), principal);
    await usdc.connect(guarantor).approve(await vault.getAddress(), stake);
    await harness.registerAndFund(
      3n,
      await mock.getAddress(),
      lender.address,
      guarantor.address,
      principal,
      stake,
    );
    await mock.releaseFunds(3n, borrower.address, principal);

    const part = 20n * 10n ** 6n;
    await usdc.mint(borrower.address, part);
    await usdc.connect(borrower).approve(await vault.getAddress(), part);
    const before = await usdc.balanceOf(lender.address);
    await mock.processRepayment(3n, part, borrower.address, lender.address);
    expect(await usdc.balanceOf(lender.address)).to.equal(before + part);
  });

  it("blocks malicious token callback re-entry (wrong msg.sender / reentrancy-safe path)", async function () {
    const { ethers } = await network.connect();
    const [owner, lender, guarantor, borrower] = await ethers.getSigners();
    const usdcF = await ethers.getContractFactory("MaliciousUSDC");
    const usdc = await usdcF.deploy();
    await usdc.waitForDeployment();
    const vF = await ethers.getContractFactory("EscrowVault");
    const vault = await vF.deploy(await usdc.getAddress(), owner.address);
    await vault.waitForDeployment();
    const hF = await ethers.getContractFactory("EscrowHarness");
    const harness = await hF.deploy(await vault.getAddress());
    await harness.waitForDeployment();
    await vault.setLoanFactory(await harness.getAddress());
    const mockF = await ethers.getContractFactory("LoanAgreementMock");
    const mock = await mockF.deploy(await vault.getAddress());
    await mock.waitForDeployment();

    const principal = 100n * 10n ** 6n;
    const stake = 10n * 10n ** 6n;
    await usdc.mint(lender.address, principal);
    await usdc.mint(guarantor.address, stake);
    await usdc.connect(lender).approve(await vault.getAddress(), principal);
    await usdc.connect(guarantor).approve(await vault.getAddress(), stake);
    await harness.registerAndFund(
      4n,
      await mock.getAddress(),
      lender.address,
      guarantor.address,
      principal,
      stake,
    );
    await mock.releaseFunds(4n, borrower.address, principal);

    await usdc.configure(await vault.getAddress(), 4n, borrower.address, lender.address);
    const repay = 5n * 10n ** 6n;
    await usdc.mint(borrower.address, repay);
    await usdc.connect(borrower).approve(await vault.getAddress(), repay * 10n);

    // MaliciousUSDC tries to call processRepayment again during transferFrom; msg.sender is the token, not the registered agreement.
    await expect(
      mock.processRepayment(4n, repay, borrower.address, lender.address),
    ).to.be.revertedWithCustomError(vault, "OnlyLoanAgreement");
  });
});
