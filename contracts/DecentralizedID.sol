// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DecentralizedID
 * @notice DID registry with community vouching for TrustChain borrowers.
 */
contract DecentralizedID is Ownable {
    uint256 public constant MIN_VOUCHES_BORROWER = 3;

    struct DIDDocument {
        string ipfsCID;
        uint256 vouchCount;
        address[] vouchers;
    }

    mapping(address => DIDDocument) private _documents;
    mapping(address => mapping(address => bool)) private _hasVouched;

    event IdentityRegistered(address indexed user, string ipfsCID);
    event VouchAdded(address indexed voucher, address indexed target);
    event VouchRevoked(address indexed voucher, address indexed target);

    error AlreadyRegistered();
    error NotRegistered();
    error SelfVouch();
    error AlreadyVouched();
    error NotVouched();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Register one DID per address.
     * @param ipfsCID IPFS CID of the DID document.
     */
    function registerIdentity(string calldata ipfsCID) external {
        if (bytes(_documents[msg.sender].ipfsCID).length != 0) revert AlreadyRegistered();
        _documents[msg.sender].ipfsCID = ipfsCID;
        emit IdentityRegistered(msg.sender, ipfsCID);
    }

    /**
     * @notice Vouch for a registered user.
     * @param target Address being vouched for.
     */
    function addVouch(address target) external {
        if (bytes(_documents[target].ipfsCID).length == 0) revert NotRegistered();
        if (target == msg.sender) revert SelfVouch();
        if (_hasVouched[target][msg.sender]) revert AlreadyVouched();
        _hasVouched[target][msg.sender] = true;
        _documents[target].vouchers.push(msg.sender);
        _documents[target].vouchCount++;
        emit VouchAdded(msg.sender, target);
    }

    /**
     * @notice Remove a prior vouch.
     * @param target Address that was vouched for.
     */
    function revokeVouch(address target) external {
        if (!_hasVouched[target][msg.sender]) revert NotVouched();
        _hasVouched[target][msg.sender] = false;
        _documents[target].vouchCount--;
        address[] storage vouchers = _documents[target].vouchers;
        uint256 len = vouchers.length;
        for (uint256 i = 0; i < len; i++) {
            if (vouchers[i] == msg.sender) {
                vouchers[i] = vouchers[len - 1];
                vouchers.pop();
                break;
            }
        }
        emit VouchRevoked(msg.sender, target);
    }

    /// @return Number of active vouches for `user`.
    function getVouchCount(address user) external view returns (uint256) {
        return _documents[user].vouchCount;
    }

    /// @return True if the user has at least three vouches and a DID.
    function isEligibleBorrower(address user) external view returns (bool) {
        return bytes(_documents[user].ipfsCID).length != 0
            && _documents[user].vouchCount >= MIN_VOUCHES_BORROWER;
    }

    /// @return Stored IPFS CID (empty if not registered).
    function getIpfsCID(address user) external view returns (string memory) {
        return _documents[user].ipfsCID;
    }
}
