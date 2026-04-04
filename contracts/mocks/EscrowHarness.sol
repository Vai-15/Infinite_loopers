// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EscrowVault} from "../EscrowVault.sol";

/**
 * @title EscrowHarness
 * @notice Minimal factory-style helper for escrow tests (registers + deposits).
 */
contract EscrowHarness {
    EscrowVault public immutable vault;

    constructor(EscrowVault vault_) {
        vault = vault_;
    }

    function registerAndFund(
        uint256 loanId,
        address agreement,
        address lender,
        address guarantor,
        uint256 principal,
        uint256 stake
    ) external {
        vault.registerLoan(loanId, agreement);
        vault.depositFunds(loanId, lender, principal, guarantor, stake);
    }
}
