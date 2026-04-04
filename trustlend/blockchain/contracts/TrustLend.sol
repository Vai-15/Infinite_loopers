// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TrustLend is ReentrancyGuard {
    enum LoanStatus {
        Open,
        Funded,
        Repaid,
        Defaulted
    }

    struct Loan {
        uint256 id;
        address borrower;
        address lender;
        uint256 amount;
        uint256 duration;
        uint256 startTime;
        LoanStatus status;
        uint256 interestRate;
    }

    uint256 public loanCounter;
    uint256 private constant REPAY_SCORE_INCREMENT = 10;
    uint256 private constant DEFAULT_SCORE_PENALTY = 5;

    mapping(uint256 => Loan) private loans;
    mapping(address => uint256[]) private borrowerLoans;
    mapping(address => uint256[]) private lenderLoans;
    mapping(address => uint256) private trustScore;

    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanFunded(uint256 indexed loanId, address indexed lender);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower);
    event LoanDefaulted(uint256 indexed loanId);

    function createLoan(uint256 amount, uint256 durationDays, uint256 interestRate) external {
        require(amount > 0, "Amount must be greater than zero");
        require(durationDays > 0, "Duration must be greater than zero");

        loanCounter += 1;
        uint256 durationInSeconds = durationDays * 1 days;

        loans[loanCounter] = Loan({
            id: loanCounter,
            borrower: msg.sender,
            lender: address(0),
            amount: amount,
            duration: durationInSeconds,
            startTime: 0,
            status: LoanStatus.Open,
            interestRate: interestRate
        });

        borrowerLoans[msg.sender].push(loanCounter);

        emit LoanCreated(loanCounter, msg.sender, amount);
    }

    function fundLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Open, "Loan is not open");
        require(msg.sender != loan.borrower, "Borrower cannot fund own loan");
        require(msg.value == loan.amount, "Incorrect funding amount");

        loan.lender = msg.sender;
        loan.startTime = block.timestamp;
        loan.status = LoanStatus.Funded;
        lenderLoans[msg.sender].push(loanId);

        (bool sent, ) = payable(loan.borrower).call{value: msg.value}("");
        require(sent, "Transfer to borrower failed");

        emit LoanFunded(loanId, msg.sender);
    }

    function repayLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Funded, "Loan is not funded");
        require(msg.sender == loan.borrower, "Only borrower can repay");

        uint256 interest = (loan.amount * loan.interestRate) / 100;
        uint256 totalDue = loan.amount + interest;
        require(msg.value == totalDue, "Incorrect repayment amount");

        loan.status = LoanStatus.Repaid;
        trustScore[loan.borrower] += REPAY_SCORE_INCREMENT;

        (bool sent, ) = payable(loan.lender).call{value: msg.value}("");
        require(sent, "Transfer to lender failed");

        emit LoanRepaid(loanId, msg.sender);
    }

    function markDefault(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Funded, "Loan is not funded");
        require(msg.sender == loan.lender, "Only lender can mark default");
        require(block.timestamp > loan.startTime + loan.duration, "Loan duration has not expired");

        loan.status = LoanStatus.Defaulted;

        uint256 currentScore = trustScore[loan.borrower];
        if (currentScore > DEFAULT_SCORE_PENALTY) {
            trustScore[loan.borrower] = currentScore - DEFAULT_SCORE_PENALTY;
        } else {
            trustScore[loan.borrower] = 0;
        }

        emit LoanDefaulted(loanId);
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        require(loans[loanId].id != 0, "Loan does not exist");
        return loans[loanId];
    }

    function getOpenLoans() external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i = 1; i <= loanCounter; i++) {
            if (loans[i].status == LoanStatus.Open) {
                count += 1;
            }
        }

        uint256[] memory openLoanIds = new uint256[](count);
        uint256 index;
        for (uint256 i = 1; i <= loanCounter; i++) {
            if (loans[i].status == LoanStatus.Open) {
                openLoanIds[index] = i;
                index += 1;
            }
        }

        return openLoanIds;
    }

    function getTrustScore(address user) external view returns (uint256) {
        return trustScore[user];
    }

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    function getLenderLoans(address lender) external view returns (uint256[] memory) {
        return lenderLoans[lender];
    }
}
