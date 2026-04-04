// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Lending {
    struct Loan {
        address borrower;
        uint256 amount;
        bool repaid;
    }

    Loan[] public loans;

    function requestLoan(uint256 _amount) public {
        loans.push(Loan(msg.sender, _amount, false));
    }

    function repayLoan(uint256 index) public {
        require(msg.sender == loans[index].borrower, "Not borrower");
        loans[index].repaid = true;
    }

    function getLoans() public view returns (Loan[] memory) {
        return loans;
    }
}
