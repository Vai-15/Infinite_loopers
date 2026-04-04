// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ILoanFactory} from "./interfaces/ILoanFactory.sol";
import {EscrowVault} from "./EscrowVault.sol";

/**
 * @title LoanAgreement
 * @notice Per-loan state machine between borrower, lender, and guarantor.
 */
contract LoanAgreement is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum LoanState {
        Pending,
        Active,
        Repaying,
        Completed,
        Defaulted
    }

    ILoanFactory public immutable factory;
    EscrowVault public immutable vault;
    IERC20 public immutable usdc;
    address public immutable trustDAO;
    uint256 public immutable loanId;
    address public borrower;
    address public lender;
    address public guarantor;
    uint256 public principal;
    uint256 public aprBPS;
    uint256 public termDays;
    string public borrowerDID;
    uint256 public activatedAt;
    uint256 public interestOwed;
    uint256 public totalDue;
    uint256 public totalRepaid;
    LoanState public state;
    uint256 public extraTermSeconds;
    bool public defaultDeclared;

    event LoanActivated(address indexed lender, uint256 timestamp);
    event RepaymentMade(address indexed borrower, uint256 amount, uint256 totalRepaid);
    event LoanCompleted(address indexed borrower, address indexed lender);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);
    event DisputeExtensionApplied(uint256 extraSeconds);

    error BadCaller();
    error BadState();
    error ZeroAddress();

    uint256 public constant GRACE_PERIOD = 7 days;
    uint256 public constant DISPUTE_EXTENSION = 30 days;
    uint256 private constant BPS_DENOM = 10_000;
    uint256 private constant APR_YEAR_SECONDS = 365 days;

    modifier onlyBorrower() {
        if (msg.sender != borrower) revert BadCaller();
        _;
    }

    modifier onlyLender() {
        if (msg.sender != lender) revert BadCaller();
        _;
    }

    modifier onlyTrustDAO() {
        if (msg.sender != trustDAO) revert BadCaller();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != address(factory)) revert BadCaller();
        _;
    }

    /**
     * @notice Factory sets the lender after funding.
     * @param lender_ Funded lender address.
     */
    function setLender(address lender_) external onlyFactory {
        if (lender != address(0)) revert BadState();
        if (lender_ == address(0)) revert ZeroAddress();
        lender = lender_;
    }

    constructor(
        address factory_,
        address vault_,
        address usdc_,
        address trustDAO_,
        address borrower_,
        address lender_,
        address guarantor_,
        uint256 principalUSDC_,
        uint256 aprBPS_,
        uint256 termDays_,
        uint256 loanId_,
        string memory borrowerDID_
    ) {
        if (
            factory_ == address(0) || vault_ == address(0) || usdc_ == address(0)
                || trustDAO_ == address(0) || borrower_ == address(0) || guarantor_ == address(0)
        ) revert ZeroAddress();
        factory = ILoanFactory(factory_);
        vault = EscrowVault(vault_);
        usdc = IERC20(usdc_);
        trustDAO = trustDAO_;
        borrower = borrower_;
        lender = lender_;
        guarantor = guarantor_;
        principal = principalUSDC_;
        aprBPS = aprBPS_;
        termDays = termDays_;
        loanId = loanId_;
        borrowerDID = borrowerDID_;
    }

    /**
     * @notice Lender confirms funding release to borrower.
     */
    function activateLoan() external onlyLender nonReentrant {
        if (state != LoanState.Pending) revert BadState();
        interestOwed = (principal * aprBPS * termDays) / (BPS_DENOM * 365);
        totalDue = principal + interestOwed;
        activatedAt = block.timestamp;
        state = LoanState.Active;
        vault.releaseFunds(loanId, borrower, principal);
        emit LoanActivated(lender, block.timestamp);
    }

    /**
     * @notice Borrower repays USDC toward principal+interest.
     * @param amount USDC amount (6 decimals).
     */
    function makeRepayment(uint256 amount) external onlyBorrower nonReentrant {
        if (state != LoanState.Active && state != LoanState.Repaying) revert BadState();
        state = LoanState.Repaying;
        vault.processRepayment(loanId, amount, borrower, lender);
        totalRepaid += amount;
        emit RepaymentMade(borrower, amount, totalRepaid);
        if (totalRepaid >= totalDue) {
            _complete();
        }
    }

    /**
     * @return principalAmount Original principal.
     * @return interestAmount Accrued simple interest for the term.
     * @return total Total owed (principal + interest).
     */
    function calculateDue()
        external
        view
        returns (uint256 principalAmount, uint256 interestAmount, uint256 total)
    {
        principalAmount = principal;
        interestAmount = (principal * aprBPS * termDays) / (BPS_DENOM * 365);
        total = principalAmount + interestAmount;
    }

    /// @return Whether total repayments meet or exceed amount due.
    function isFullyRepaid() external view returns (bool) {
        return totalRepaid >= totalDue && totalDue != 0;
    }

    /// @return Timestamp after which default can be declared (includes grace and extensions).
    function defaultDeadline() public view returns (uint256) {
        if (activatedAt == 0) return 0;
        return activatedAt + (termDays * 1 days) + GRACE_PERIOD + extraTermSeconds;
    }

    /**
     * @notice Mark default after grace; slashes guarantor via vault.
     */
    function declareDefault() external nonReentrant {
        if (state != LoanState.Active && state != LoanState.Repaying) revert BadState();
        if (block.timestamp <= defaultDeadline()) revert BadState();
        if (totalRepaid >= totalDue) revert BadState();
        defaultDeclared = true;
        state = LoanState.Defaulted;
        vault.slashGuarantor(loanId, lender);
        vault.markDefaulted(loanId);
        factory.notifyLoanDefaulted(borrower, guarantor, loanId);
        emit LoanDefaulted(loanId, borrower);
    }

    /**
     * @notice TrustDAO: borrower wins dispute — extend repayment window.
     */
    function applyBorrowerDisputeWin() external onlyTrustDAO nonReentrant {
        if (state != LoanState.Defaulted) revert BadState();
        defaultDeclared = false;
        state = LoanState.Repaying;
        extraTermSeconds += DISPUTE_EXTENSION;
        vault.markRepayingAfterDispute(loanId);
        emit DisputeExtensionApplied(DISPUTE_EXTENSION);
    }

    /**
     * @notice TrustDAO: lender wins — enforce slash + default bookkeeping (idempotent if already slashed).
     */
    function applyLenderDisputeWin() external onlyTrustDAO nonReentrant {
        vault.slashGuarantor(loanId, lender);
        if (state != LoanState.Defaulted) {
            state = LoanState.Defaulted;
        }
        vault.markDefaulted(loanId);
    }

    function _complete() private {
        state = LoanState.Completed;
        vault.markCompleted(loanId);
        factory.notifyLoanRepaid(borrower, totalRepaid);
        emit LoanCompleted(borrower, lender);
    }
}
