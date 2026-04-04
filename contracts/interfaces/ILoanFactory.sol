// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILoanFactory
 * @notice Callback surface invoked by {LoanAgreement} for lifecycle hooks.
 */
interface ILoanFactory {
    /// @notice Called when a loan is fully repaid.
    function notifyLoanRepaid(address borrower, uint256 totalRepaid) external;

    /// @notice Called when a loan defaults (or dispute resolves for lender).
    function notifyLoanDefaulted(
        address borrower,
        address guarantor,
        uint256 loanId
    ) external;

    /// @notice Returns the deployed agreement for a loan id.
    function getLoanAgreement(uint256 loanId) external view returns (address);
}
