# TrustLend Architecture

## Overview
TrustLend is a decentralized peer-to-peer ETH lending protocol where borrowers create loan requests and lenders fund loans directly, while smart contracts enforce loan lifecycle rules and trust scoring.

## Folder Layout
- `blockchain/`: Hardhat project, Solidity contract, deployment script, and tests.
- `client/`: Frontend application placeholder for wallet UI and dashboards.
- `server/`: Backend placeholder for optional indexing/analytics services.
- `docs/`: Architecture and implementation documentation.

## Core On-Chain Components
- `TrustLend.sol`
  - Loan lifecycle: `Open -> Funded -> Repaid | Defaulted`
  - Escrow and state enforcement for funding/repayment/default
  - Trust score updates based on repay/default outcomes
  - Borrower and lender loan indexing for UI queries

## Loan Flow
1. Borrower calls `createLoan(amount, durationDays, interestRate)`.
2. Lender calls `fundLoan(loanId)` with exact ETH.
3. Contract forwards ETH to borrower and marks loan `Funded`.
4. Borrower repays `principal + interest` via `repayLoan(loanId)`.
5. Contract forwards repayment to lender and marks loan `Repaid`.
6. If overdue, lender can call `markDefault(loanId)` to mark `Defaulted`.

## Security Model
- `ReentrancyGuard` on payable entry points.
- Strict `require` checks for role, amount, and state transitions.
- Borrowers cannot self-fund.
- Only borrower can repay and only lender can default a funded loan.

## Next Steps
- Add frontend wallet integration (RainbowKit/Wagmi/Ethers).
- Add indexed events or The Graph for efficient loan discovery.
- Extend trust scoring into rate limits, collateral requirements, and dynamic interest curves.
