// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EscrowVault} from "../EscrowVault.sol";

/**
 * @title LoanAgreementMock
 * @notice Thin wrapper to invoke vault hooks as the registered loan agreement.
 */
contract LoanAgreementMock {
    EscrowVault public immutable vault;

    constructor(EscrowVault vault_) {
        vault = vault_;
    }

    function releaseFunds(uint256 loanId, address borrower, uint256 amount) external {
        vault.releaseFunds(loanId, borrower, amount);
    }

    function processRepayment(
        uint256 loanId,
        uint256 amount,
        address payer,
        address lender
    ) external {
        vault.processRepayment(loanId, amount, payer, lender);
    }
}
