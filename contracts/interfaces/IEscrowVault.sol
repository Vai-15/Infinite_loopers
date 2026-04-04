// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEscrowVault
 * @notice Minimal vault API used by {LoanAgreement}.
 */
interface IEscrowVault {
    function releaseFunds(uint256 loanId) external;

    function processRepayment(uint256 loanId, uint256 amount, address payer) external;

    function slashGuarantor(uint256 loanId, address lender) external;
}
