// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {DecentralizedID} from "./DecentralizedID.sol";
import {ReputationNFT} from "./ReputationNFT.sol";
import {EscrowVault} from "./EscrowVault.sol";
import {LoanAgreement} from "./LoanAgreement.sol";
import {ILoanFactory} from "./interfaces/ILoanFactory.sol";

/**
 * @title LoanFactory
 * @notice Creates loans, coordinates escrow funding, and updates reputation.
 */
contract LoanFactory is Ownable, ILoanFactory {
    using SafeERC20 for IERC20;

    struct LoanSummary {
        uint256 loanId;
        address agreement;
        address borrower;
        address lender;
        uint256 principal;
        uint8 state;
    }

    DecentralizedID public immutable didRegistry;
    ReputationNFT public immutable reputation;
    EscrowVault public immutable vault;
    IERC20 public immutable usdc;

    uint256 public loanIdCounter;
    mapping(uint256 => address) private _loans;
    mapping(address => uint256[]) private _borrowerLoans;
    mapping(address => uint256[]) private _lenderLoans;
    mapping(address => bool) public borrowerInDefault;

    address public trustDAO;
    uint256 public constant GUARANTOR_BPS = 1000;
    uint256 public constant REPAY_SCORE_BONUS = 100;
    uint256 public constant MAX_SCORE = 1000;

    event LoanRequested(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 principal,
        uint256 aprBPS,
        uint256 termDays,
        address guarantor
    );
    event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 principal, uint256 guarantorStake);
    event LoanCompleted(uint256 indexed loanId, address indexed borrower);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);
    event TrustDAOSet(address indexed trustDAO);

    error NotEligible();
    error InDefault();
    error TrustDAONotSet();
    error UnknownLoan();
    error BadState();
    error TrustDAOAlreadySet();

    constructor(
        address didRegistry_,
        address reputation_,
        address vault_,
        address usdc_,
        address initialOwner
    ) Ownable(initialOwner) {
        didRegistry = DecentralizedID(didRegistry_);
        reputation = ReputationNFT(reputation_);
        vault = EscrowVault(vault_);
        usdc = IERC20(usdc_);
    }

    /**
     * @notice One-time wiring of the TrustDAO address (required before loans).
     * @param trustDAO_ Deployed TrustDAO.
     */
    function setTrustDAO(address trustDAO_) external onlyOwner {
        if (trustDAO != address(0)) revert TrustDAOAlreadySet();
        if (trustDAO_ == address(0)) revert TrustDAONotSet();
        trustDAO = trustDAO_;
        emit TrustDAOSet(trustDAO_);
    }

    /**
     * @notice Borrower opens a loan request; deploys {LoanAgreement}.
     * @param amount Principal in USDC (6 decimals).
     * @param aprBPS Annual rate in basis points.
     * @param termDays Loan term in days.
     * @param guarantor Guarantor address.
     * @param borrowerDID IPFS CID string for the borrower DID.
     * @return loanId New loan identifier.
     */
    function createLoanRequest(
        uint256 amount,
        uint256 aprBPS,
        uint256 termDays,
        address guarantor,
        string calldata borrowerDID
    ) external returns (uint256) {
        if (trustDAO == address(0)) revert TrustDAONotSet();
        if (!didRegistry.isEligibleBorrower(msg.sender)) revert NotEligible();
        if (borrowerInDefault[msg.sender]) revert InDefault();
        if (guarantor == address(0)) revert NotEligible();

        loanIdCounter++;
        uint256 id = loanIdCounter;

        LoanAgreement agreement = new LoanAgreement(
            address(this),
            address(vault),
            address(usdc),
            trustDAO,
            msg.sender,
            address(0),
            guarantor,
            amount,
            aprBPS,
            termDays,
            id,
            borrowerDID
        );

        _loans[id] = address(agreement);
        _borrowerLoans[msg.sender].push(id);

        vault.registerLoan(id, address(agreement));

        emit LoanRequested(id, msg.sender, amount, aprBPS, termDays, guarantor);
        return id;
    }

    /**
     * @notice Lender funds escrow and becomes the loan lender.
     * @param loanId Loan to fund.
     */
    function fundLoan(uint256 loanId) external {
        address agreementAddr = _loans[loanId];
        if (agreementAddr == address(0)) revert UnknownLoan();

        LoanAgreement agreement = LoanAgreement(agreementAddr);
        if (uint256(agreement.state()) != uint256(LoanAgreement.LoanState.Pending)) revert BadState();

        uint256 principal = agreement.principal();
        address guarantor = agreement.guarantor();
        uint256 stake = (principal * GUARANTOR_BPS) / 10_000;

        agreement.setLender(msg.sender);

        vault.depositFunds(loanId, msg.sender, principal, guarantor, stake);

        _lenderLoans[msg.sender].push(loanId);

        emit LoanFunded(loanId, msg.sender, principal, stake);
    }

    /// @inheritdoc ILoanFactory
    function notifyLoanRepaid(address borrower, uint256 /* totalRepaid */) external override {
        uint256 id = LoanAgreement(msg.sender).loanId();
        if (_loans[id] != msg.sender) revert UnknownLoan();

        uint256 current = reputation.trustScoreOf(borrower);
        uint256 next = current == 0 ? 200 : current + REPAY_SCORE_BONUS;
        if (next > MAX_SCORE) next = MAX_SCORE;
        reputation.upgradeReputation(borrower, next);

        emit LoanCompleted(id, borrower);
    }

    /// @inheritdoc ILoanFactory
    function notifyLoanDefaulted(address borrower, address, uint256 loanId) external override {
        if (_loans[loanId] != msg.sender) revert UnknownLoan();
        borrowerInDefault[borrower] = true;
        reputation.burnReputation(borrower);
        emit LoanDefaulted(loanId, borrower);
    }

    /// @inheritdoc ILoanFactory
    function getLoanAgreement(uint256 loanId) external view override returns (address) {
        return _loans[loanId];
    }

    function getLoansByBorrower(address borrower) external view returns (uint256[] memory) {
        return _borrowerLoans[borrower];
    }

    function getLoansByLender(address lender) external view returns (uint256[] memory) {
        return _lenderLoans[lender];
    }

    /// @return summaries Metadata for all loans (unbounded; for off-chain indexing in production).
    function getAllLoans() external view returns (LoanSummary[] memory summaries) {
        uint256 n = loanIdCounter;
        summaries = new LoanSummary[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = i + 1;
            address a = _loans[id];
            if (a == address(0)) continue;
            LoanAgreement la = LoanAgreement(a);
            summaries[i] = LoanSummary({
                loanId: id,
                agreement: a,
                borrower: la.borrower(),
                lender: la.lender(),
                principal: la.principal(),
                state: uint8(la.state())
            });
        }
    }

    /**
     * @dev Internal hook for tests / future modules adjusting trust scores.
     */
    function updateTrustScore(address user, uint256 newScore, bool) external onlyOwner {
        reputation.upgradeReputation(user, newScore);
    }
}
