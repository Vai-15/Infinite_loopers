// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title ReputationNFT
 * @notice Soulbound ERC-1155 tiers for TrustChain credit scores.
 */
contract ReputationNFT is ERC1155, Ownable {
    mapping(address => bool) private _authorized;
    mapping(uint256 => uint256) private _scores;
    mapping(address => uint256) private _holderTokenId;
    uint256 private _nextId = 1;

    event AuthorizedSet(address indexed account, bool allowed);

    error Soulbound();
    error NotAuthorized();
    error ZeroAddress();

    modifier onlyAuthorized() {
        if (!_authorized[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        _;
    }

    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {}

    /**
     * @notice Authorize {LoanFactory} or {EscrowVault} to manage reputation.
     * @param account Contract address.
     * @param allowed Whether the account is authorized.
     */
    function setAuthorized(address account, bool allowed) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        _authorized[account] = allowed;
        emit AuthorizedSet(account, allowed);
    }

    function isAuthorized(address account) external view returns (bool) {
        return _authorized[account];
    }

    /// @inheritdoc ERC1155
    function uri(uint256 id) public view override returns (string memory) {
        uint256 score = _scores[id];
        if (score == 0) return "";
        uint256 tier = getTier(score);
        string memory tierName = _tierName(tier);
        bytes memory svg = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 140">',
            '<rect width="100%" height="100%" fill="#0f172a"/>',
            '<text x="24" y="48" fill="#f8fafc" font-size="18" font-family="monospace">TrustChain</text>',
            '<text x="24" y="78" fill="#38bdf8" font-size="14" font-family="monospace">Tier: ',
            tierName,
            "</text>",
            '<text x="24" y="104" fill="#a5f3fc" font-size="14" font-family="monospace">Score: ',
            Strings.toString(score),
            "</text></svg>"
        );
        return string.concat(
            "data:image/svg+xml;base64,",
            Base64.encode(svg)
        );
    }

    /**
     * @notice Mint reputation for `to` at `score` (burns prior soulbound id if any).
     * @param to Recipient.
     * @param score Trust score 0-1000.
     */
    function mintReputation(address to, uint256 score) external onlyAuthorized {
        _mintReputation(to, score);
    }

    /**
     * @notice Burn all reputation for `holder` (e.g. default).
     * @param holder Address holding the soulbound token.
     */
    function burnReputation(address holder) external onlyAuthorized {
        uint256 id = _holderTokenId[holder];
        if (id == 0) return;
        _burn(holder, id, 1);
        delete _scores[id];
        delete _holderTokenId[holder];
    }

    /**
     * @notice Upgrade score after successful repayment behavior.
     * @param holder Holder address.
     * @param newScore Updated score.
     */
    function upgradeReputation(address holder, uint256 newScore) external onlyAuthorized {
        _mintReputation(holder, newScore);
    }

    function _mintReputation(address to, uint256 score) private {
        if (to == address(0)) revert ZeroAddress();
        uint256 existing = _holderTokenId[to];
        if (existing != 0) {
            _burn(to, existing, 1);
            delete _scores[existing];
        }
        uint256 id = _nextId++;
        _scores[id] = score;
        _holderTokenId[to] = id;
        _mint(to, id, 1, "");
    }

    /// @return Tier id: 1 Bronze, 2 Silver, 3 Gold, 4 Diamond.
    function getTier(uint256 score) public pure returns (uint256) {
        if (score <= 250) return 1;
        if (score <= 500) return 2;
        if (score <= 750) return 3;
        return 4;
    }

    /// @return Current trust score for `holder` (0 if none).
    function trustScoreOf(address holder) external view returns (uint256) {
        uint256 id = _holderTokenId[holder];
        if (id == 0) return 0;
        return _scores[id];
    }

    /// @dev Soulbound: block transfers between non-zero addresses.
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        if (from != address(0) && to != address(0)) revert Soulbound();
        super._update(from, to, ids, values);
    }

    function _tierName(uint256 tier) private pure returns (string memory) {
        if (tier == 1) return "Bronze";
        if (tier == 2) return "Silver";
        if (tier == 3) return "Gold";
        return "Diamond";
    }
}
