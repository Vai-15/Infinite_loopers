// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReputationNFT
 * @notice Reputation controls used by {LoanFactory} and {TrustDAO}.
 */
interface IReputationNFT {
    function mintReputation(address to, uint256 score) external;

    function burnReputation(address holder) external;

    function upgradeReputation(address holder, uint256 newScore) external;

    function trustScoreOf(address holder) external view returns (uint256);

    function balanceOf(address account, uint256 id) external view returns (uint256);
}
