// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EscrowVault} from "../EscrowVault.sol";

/**
 * @title MaliciousUSDC
 * @notice Test double that attempts reentrancy into {EscrowVault.processRepayment}.
 */
contract MaliciousUSDC is ERC20 {
    EscrowVault public vault;
    uint256 public attackLoanId;
    address public attackPayer;
    address public attackLender;
    bool private _inAttack;

    constructor() ERC20("Malicious USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function configure(
        EscrowVault vault_,
        uint256 loanId_,
        address payer_,
        address lender_
    ) external {
        vault = vault_;
        attackLoanId = loanId_;
        attackPayer = payer_;
        attackLender = lender_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (
            address(vault) != address(0) && msg.sender == address(vault) && !_inAttack
                && attackLoanId != 0
        ) {
            _inAttack = true;
            vault.processRepayment(attackLoanId, 1, attackPayer, attackLender);
            _inAttack = false;
        }
        return super.transferFrom(from, to, amount);
    }
}
