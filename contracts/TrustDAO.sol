// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LoanFactory} from "./LoanFactory.sol";
import {LoanAgreement} from "./LoanAgreement.sol";
import {ReputationNFT} from "./ReputationNFT.sol";

/**
 * @title TrustDAO
 * @notice Reputation-weighted disputes for defaulted TrustChain loans.
 */
contract TrustDAO {
    ReputationNFT public immutable reputation;
    LoanFactory public immutable factory;

    uint256 public constant VOTING_PERIOD = 72 hours;

    enum DisputeStatus {
        None,
        Open,
        BorrowerWon,
        LenderWon
    }

    struct Dispute {
        uint256 loanId;
        address initiator;
        string evidence;
        uint256 createdAt;
        uint256 borrowerWeight;
        uint256 lenderWeight;
        bool resolved;
    }

    uint256 private _disputeIdCounter;
    mapping(uint256 => Dispute) private _disputes;
    mapping(uint256 => DisputeStatus) private _status;
    mapping(uint256 => mapping(address => bool)) private _voted;

    event DisputeCreated(uint256 indexed disputeId, uint256 indexed loanId, address indexed initiator);
    event VoteCast(uint256 indexed disputeId, address indexed voter, bool supportBorrower, uint256 weight);
    event DisputeResolved(uint256 indexed disputeId, DisputeStatus outcome);

    error NotParty();
    error AlreadyVoted();
    error NotOpen();
    error TooEarly();
    error BadLoan();
    error NotDefaulted();
    error NoReputation();

    constructor(address reputation_, address factory_) {
        reputation = ReputationNFT(reputation_);
        factory = LoanFactory(factory_);
    }

    /**
     * @notice Open a dispute after a loan has been marked defaulted.
     * @param loanId Loan identifier.
     * @param evidence Free-form evidence string.
     * @return disputeId New dispute id.
     */
    function createDispute(uint256 loanId, string calldata evidence) external returns (uint256 disputeId) {
        address agreementAddr = factory.getLoanAgreement(loanId);
        if (agreementAddr == address(0)) revert BadLoan();
        LoanAgreement la = LoanAgreement(agreementAddr);
        if (uint256(la.state()) != uint256(LoanAgreement.LoanState.Defaulted)) revert NotDefaulted();
        if (msg.sender != la.borrower() && msg.sender != la.lender()) revert NotParty();

        _disputeIdCounter++;
        disputeId = _disputeIdCounter;
        _disputes[disputeId] = Dispute({
            loanId: loanId,
            initiator: msg.sender,
            evidence: evidence,
            createdAt: block.timestamp,
            borrowerWeight: 0,
            lenderWeight: 0,
            resolved: false
        });
        _status[disputeId] = DisputeStatus.Open;
        emit DisputeCreated(disputeId, loanId, msg.sender);
    }

    /**
     * @notice Cast a weighted vote using the voter's trust score as weight.
     * @param disputeId Dispute identifier.
     * @param supportBorrower True to side with borrower.
     */
    function castVote(uint256 disputeId, bool supportBorrower) external {
        Dispute storage d = _disputes[disputeId];
        if (_status[disputeId] != DisputeStatus.Open) revert NotOpen();
        if (d.resolved) revert NotOpen();
        if (_voted[disputeId][msg.sender]) revert AlreadyVoted();
        uint256 w = reputation.trustScoreOf(msg.sender);
        if (w == 0) revert NoReputation();
        _voted[disputeId][msg.sender] = true;
        if (supportBorrower) {
            d.borrowerWeight += w;
        } else {
            d.lenderWeight += w;
        }
        emit VoteCast(disputeId, msg.sender, supportBorrower, w);
    }

    /**
     * @notice Resolve dispute after the voting window; executes loan outcome.
     * @param disputeId Dispute identifier.
     */
    function resolveDispute(uint256 disputeId) external {
        Dispute storage d = _disputes[disputeId];
        if (_status[disputeId] != DisputeStatus.Open) revert NotOpen();
        if (d.resolved) revert NotOpen();
        if (block.timestamp < d.createdAt + VOTING_PERIOD) revert TooEarly();

        d.resolved = true;
        address agreementAddr = factory.getLoanAgreement(d.loanId);
        LoanAgreement la = LoanAgreement(agreementAddr);

        if (d.borrowerWeight > d.lenderWeight) {
            _status[disputeId] = DisputeStatus.BorrowerWon;
            la.applyBorrowerDisputeWin();
        } else {
            _status[disputeId] = DisputeStatus.LenderWon;
            la.applyLenderDisputeWin();
        }
        emit DisputeResolved(disputeId, _status[disputeId]);
    }

    /// @return Current dispute outcome / phase.
    function getDisputeStatus(uint256 disputeId) external view returns (DisputeStatus) {
        return _status[disputeId];
    }

    /// @return Number of disputes ever created (ids are 1..counter).
    function disputeCounter() external view returns (uint256) {
        return _disputeIdCounter;
    }

    function getDispute(uint256 disputeId)
        external
        view
        returns (
            uint256 loanId,
            address initiator,
            string memory evidence,
            uint256 createdAt,
            uint256 borrowerWeight,
            uint256 lenderWeight,
            bool resolved
        )
    {
        Dispute storage d = _disputes[disputeId];
        return (
            d.loanId,
            d.initiator,
            d.evidence,
            d.createdAt,
            d.borrowerWeight,
            d.lenderWeight,
            d.resolved
        );
    }
}
