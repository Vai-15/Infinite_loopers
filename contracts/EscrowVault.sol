// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EscrowVault
 * @notice USDC escrow for TrustChain loans with reentrancy protection.
 */
contract EscrowVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum EscrowStatus {
        None,
        Funded,
        Released,
        Repaying,
        Completed,
        Defaulted
    }

    struct EscrowRecord {
        uint256 totalDeposited;
        uint256 repaid;
        uint256 guarantorStake;
        EscrowStatus status;
    }

    IERC20 private immutable _usdc;
    address private _loanFactory;
    mapping(uint256 => EscrowRecord) private _records;
    mapping(uint256 => address) private _loanAgreement;

    event FundsDeposited(
        uint256 indexed loanId,
        address indexed lender,
        uint256 principal,
        uint256 guarantorStake
    );
    event FundsReleased(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event RepaymentProcessed(uint256 indexed loanId, address indexed payer, uint256 amount);
    event GuarantorSlashed(uint256 indexed loanId, address indexed lender, uint256 amount);

    error OnlyLoanFactory();
    error OnlyLoanAgreement();
    error InvalidLoan();
    error BadState();
    error ZeroAmount();
    error FactoryAlreadySet();

    modifier onlyLoanFactory() {
        if (msg.sender != _loanFactory) revert OnlyLoanFactory();
        _;
    }

    modifier onlyLoanAgreement(uint256 loanId) {
        if (msg.sender != _loanAgreement[loanId]) revert OnlyLoanAgreement();
        _;
    }

    constructor(address usdc_, address initialOwner) Ownable(initialOwner) {
        _usdc = IERC20(usdc_);
    }

    /**
     * @notice Wire the factory (once).
     * @param factory Loan factory address.
     */
    function setLoanFactory(address factory) external onlyOwner {
        if (_loanFactory != address(0)) revert FactoryAlreadySet();
        if (factory == address(0)) revert InvalidLoan();
        _loanFactory = factory;
    }

    function loanFactory() external view returns (address) {
        return _loanFactory;
    }

    /**
     * @notice Register a loan agreement for a loan id.
     * @param loanId Loan identifier.
     * @param agreement Deployed {LoanAgreement} address.
     */
    function registerLoan(uint256 loanId, address agreement) external onlyLoanFactory nonReentrant {
        if (agreement == address(0)) revert InvalidLoan();
        _loanAgreement[loanId] = agreement;
    }

    /**
     * @notice Lender principal and guarantor stake are pulled into the vault.
     * @param loanId Loan id.
     * @param lender Lender funding the loan.
     * @param principal Principal in USDC (6 decimals).
     * @param guarantor Guarantor address.
     * @param stake Guarantor stake amount.
     */
    function depositFunds(
        uint256 loanId,
        address lender,
        uint256 principal,
        address guarantor,
        uint256 stake
    ) external onlyLoanFactory nonReentrant {
        if (principal == 0) revert ZeroAmount();
        address agreement = _loanAgreement[loanId];
        if (agreement == address(0)) revert InvalidLoan();
        EscrowRecord storage r = _records[loanId];
        if (r.status != EscrowStatus.None) revert BadState();
        _usdc.safeTransferFrom(lender, address(this), principal);
        if (stake > 0) {
            _usdc.safeTransferFrom(guarantor, address(this), stake);
        }
        r.totalDeposited = principal;
        r.guarantorStake = stake;
        r.status = EscrowStatus.Funded;
        emit FundsDeposited(loanId, lender, principal, stake);
    }

    /**
     * @notice Release principal to the borrower (activation).
     * @param loanId Loan id.
     * @param borrower Borrower recipient.
     * @param amount Principal to release.
     */
    function releaseFunds(
        uint256 loanId,
        address borrower,
        uint256 amount
    ) external onlyLoanAgreement(loanId) nonReentrant {
        EscrowRecord storage r = _records[loanId];
        if (r.status != EscrowStatus.Funded) revert BadState();
        r.status = EscrowStatus.Released;
        _usdc.safeTransfer(borrower, amount);
        emit FundsReleased(loanId, borrower, amount);
    }

    /**
     * @notice Borrower repays USDC; funds forwarded to lender.
     * @param loanId Loan id.
     * @param amount Repayment amount.
     * @param payer Payer (borrower).
     * @param lender Lender recipient.
     */
    function processRepayment(
        uint256 loanId,
        uint256 amount,
        address payer,
        address lender
    ) external onlyLoanAgreement(loanId) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        EscrowRecord storage r = _records[loanId];
        if (r.status != EscrowStatus.Released && r.status != EscrowStatus.Repaying) {
            revert BadState();
        }
        r.status = EscrowStatus.Repaying;
        _usdc.safeTransferFrom(payer, address(this), amount);
        r.repaid += amount;
        _usdc.safeTransfer(lender, amount);
        emit RepaymentProcessed(loanId, payer, amount);
    }

    /**
     * @notice Slash guarantor stake to the lender after default.
     * @param loanId Loan id.
     * @param lender Lender recipient.
     */
    function slashGuarantor(uint256 loanId, address lender) external onlyLoanAgreement(loanId) nonReentrant {
        EscrowRecord storage r = _records[loanId];
        uint256 stake = r.guarantorStake;
        if (stake == 0) {
            emit GuarantorSlashed(loanId, lender, 0);
            return;
        }
        r.guarantorStake = 0;
        _usdc.safeTransfer(lender, stake);
        emit GuarantorSlashed(loanId, lender, stake);
    }

    /**
     * @notice Mark escrow as completed (bookkeeping).
     * @param loanId Loan id.
     */
    function markCompleted(uint256 loanId) external onlyLoanAgreement(loanId) nonReentrant {
        EscrowRecord storage r = _records[loanId];
        r.status = EscrowStatus.Completed;
    }

    /**
     * @notice Mark escrow defaulted (bookkeeping).
     * @param loanId Loan id.
     */
    function markDefaulted(uint256 loanId) external onlyLoanAgreement(loanId) nonReentrant {
        _records[loanId].status = EscrowStatus.Defaulted;
    }

    /**
     * @notice After a successful borrower dispute, allow repayment flow again.
     * @param loanId Loan id.
     */
    function markRepayingAfterDispute(uint256 loanId) external onlyLoanAgreement(loanId) nonReentrant {
        EscrowRecord storage r = _records[loanId];
        if (r.status == EscrowStatus.Defaulted) {
            r.status = EscrowStatus.Repaying;
        }
    }

    /// @return Remaining principal not yet repaid (off-chain interest tracked on agreement).
    function getLoanBalance(uint256 loanId) external view returns (uint256) {
        EscrowRecord storage r = _records[loanId];
        if (r.totalDeposited <= r.repaid) return 0;
        return r.totalDeposited - r.repaid;
    }

    function getEscrowRecord(uint256 loanId)
        external
        view
        returns (uint256 totalDeposited, uint256 repaid, uint256 guarantorStake, EscrowStatus status)
    {
        EscrowRecord storage r = _records[loanId];
        return (r.totalDeposited, r.repaid, r.guarantorStake, r.status);
    }
}
