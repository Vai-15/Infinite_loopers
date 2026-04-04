// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Testnet ERC-20 with 6 decimals and open mint for protocol demos.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    /// @notice USDC-compatible decimals.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint tokens to any address (testnet only).
     * @param to Recipient address.
     * @param amount Amount in base units (6 decimals).
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
