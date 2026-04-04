const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TrustLend", function () {
    let trustLend;
    let borrower;
    let lender;
    let outsider;

    const ONE_DAY = 24 * 60 * 60;
    const AMOUNT = ethers.parseEther("1");
    const DURATION_DAYS = 7;
    const INTEREST_RATE = 10;

    beforeEach(async function () {
        [, borrower, lender, outsider] = await ethers.getSigners();
        const TrustLend = await ethers.getContractFactory("TrustLend");
        trustLend = await TrustLend.deploy();
        await trustLend.waitForDeployment();
    });

    async function createLoan() {
        await trustLend.connect(borrower).createLoan(AMOUNT, DURATION_DAYS, INTEREST_RATE);
        return 1n;
    }

    async function fundLoan(loanId) {
        await trustLend.connect(lender).fundLoan(loanId, { value: AMOUNT });
    }

    describe("createLoan", function () {
        it("emits LoanCreated and stores correct data", async function () {
            await expect(
                trustLend.connect(borrower).createLoan(AMOUNT, DURATION_DAYS, INTEREST_RATE)
            )
                .to.emit(trustLend, "LoanCreated")
                .withArgs(1n, borrower.address, AMOUNT);

            const loan = await trustLend.getLoan(1n);
            expect(loan.id).to.equal(1n);
            expect(loan.borrower).to.equal(borrower.address);
            expect(loan.amount).to.equal(AMOUNT);
            expect(loan.duration).to.equal(BigInt(DURATION_DAYS * ONE_DAY));
            expect(loan.status).to.equal(0);
            expect(loan.interestRate).to.equal(INTEREST_RATE);
        });

        it("rejects zero amount", async function () {
            await expect(
                trustLend.connect(borrower).createLoan(0, DURATION_DAYS, INTEREST_RATE)
            ).to.be.revertedWith("Amount must be greater than zero");
        });
    });

    describe("fundLoan", function () {
        it("transfers ETH to borrower and sets status to Funded", async function () {
            const loanId = await createLoan();
            const borrowerBefore = await ethers.provider.getBalance(borrower.address);

            await expect(trustLend.connect(lender).fundLoan(loanId, { value: AMOUNT }))
                .to.emit(trustLend, "LoanFunded")
                .withArgs(loanId, lender.address);

            const borrowerAfter = await ethers.provider.getBalance(borrower.address);
            expect(borrowerAfter - borrowerBefore).to.equal(AMOUNT);

            const loan = await trustLend.getLoan(loanId);
            expect(loan.status).to.equal(1);
            expect(loan.lender).to.equal(lender.address);
            expect(loan.startTime).to.be.greaterThan(0);
        });

        it("rejects wrong amount", async function () {
            const loanId = await createLoan();
            await expect(
                trustLend.connect(lender).fundLoan(loanId, { value: ethers.parseEther("0.5") })
            ).to.be.revertedWith("Incorrect funding amount");
        });

        it("rejects self-funding", async function () {
            const loanId = await createLoan();
            await expect(
                trustLend.connect(borrower).fundLoan(loanId, { value: AMOUNT })
            ).to.be.revertedWith("Borrower cannot fund own loan");
        });

        it("rejects duplicate funding", async function () {
            const loanId = await createLoan();
            await fundLoan(loanId);

            await expect(
                trustLend.connect(outsider).fundLoan(loanId, { value: AMOUNT })
            ).to.be.revertedWith("Loan is not open");
        });
    });

    describe("repayLoan", function () {
        it("transfers ETH to lender, sets status to Repaid, and updates trust score", async function () {
            const loanId = await createLoan();
            await fundLoan(loanId);

            const totalDue = AMOUNT + (AMOUNT * BigInt(INTEREST_RATE)) / 100n;
            const lenderBefore = await ethers.provider.getBalance(lender.address);

            await expect(trustLend.connect(borrower).repayLoan(loanId, { value: totalDue }))
                .to.emit(trustLend, "LoanRepaid")
                .withArgs(loanId, borrower.address);

            const lenderAfter = await ethers.provider.getBalance(lender.address);
            expect(lenderAfter - lenderBefore).to.equal(totalDue);

            const loan = await trustLend.getLoan(loanId);
            expect(loan.status).to.equal(2);

            const score = await trustLend.getTrustScore(borrower.address);
            expect(score).to.equal(10n);
        });

        it("rejects non-borrower repayment", async function () {
            const loanId = await createLoan();
            await fundLoan(loanId);

            const totalDue = AMOUNT + (AMOUNT * BigInt(INTEREST_RATE)) / 100n;
            await expect(
                trustLend.connect(outsider).repayLoan(loanId, { value: totalDue })
            ).to.be.revertedWith("Only borrower can repay");
        });
    });

    describe("markDefault", function () {
        it("sets status to Defaulted after expiry", async function () {
            const loanId = await createLoan();
            await fundLoan(loanId);

            await time.increase(DURATION_DAYS * ONE_DAY + 1);

            await expect(trustLend.connect(lender).markDefault(loanId))
                .to.emit(trustLend, "LoanDefaulted")
                .withArgs(loanId);

            const loan = await trustLend.getLoan(loanId);
            expect(loan.status).to.equal(3);
        });

        it("rejects early call", async function () {
            const loanId = await createLoan();
            await fundLoan(loanId);

            await expect(trustLend.connect(lender).markDefault(loanId)).to.be.revertedWith(
                "Loan duration has not expired"
            );
        });
    });

    describe("Trust score", function () {
        it("increases on repay and decreases on default", async function () {
            const firstLoanId = await createLoan();
            await fundLoan(firstLoanId);

            const firstDue = AMOUNT + (AMOUNT * BigInt(INTEREST_RATE)) / 100n;
            await trustLend.connect(borrower).repayLoan(firstLoanId, { value: firstDue });

            const scoreAfterRepay = await trustLend.getTrustScore(borrower.address);
            expect(scoreAfterRepay).to.equal(10n);

            await trustLend.connect(borrower).createLoan(AMOUNT, 1, INTEREST_RATE);
            const secondLoanId = 2n;
            await fundLoan(secondLoanId);
            await time.increase(ONE_DAY + 1);

            await trustLend.connect(lender).markDefault(secondLoanId);
            const scoreAfterDefault = await trustLend.getTrustScore(borrower.address);
            expect(scoreAfterDefault).to.equal(5n);
        });
    });
});
