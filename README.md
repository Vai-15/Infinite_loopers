# HackNakshatra (DecentraLend)

DecentraLend is a decentralized P2P lending platform with:
- smart contracts for on-chain loan lifecycle and reputation
- FastAPI backend for API orchestration and analytics
- Vite + React frontend for borrower/lender workflows
- ML pipeline for credit-risk scoring

This README is designed so a new contributor can run and understand the project quickly.

## 1) High-Level Architecture

- `contracts/`: Solidity contracts (loan flow, escrow, reputation, DAO, DID)
- `scripts/`: deployment/seed/verify scripts for Hardhat
- `test/`: contract tests (Hardhat + Mocha)
- `backend/`: FastAPI app (`/api/v1/*`) with loan, user, credit, community, analytics endpoints
- `ml/`: synthetic data generation, model training, evaluation
- `frontend/`: merged production frontend (Vite + React)
- `docs/`: architecture and merge notes

## 2) Prerequisites

- Node.js 20+
- Python 3.11+ (tested with Python 3.14 locally)
- Docker + Docker Compose
- MetaMask wallet (for testnet/mainnet deployment/interactions)

## 3) Environment Setup

### Root env

Create root `.env` from template:

- macOS/Linux:
```bash
cp .env.example .env
```

- Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Important root vars:
- `PRIVATE_KEY`
- `ALCHEMY_MUMBAI_URL`
- `ALCHEMY_POLYGON_URL`
- `POLYGONSCAN_API_KEY`
- contract addresses (`LOAN_FACTORY_ADDRESS`, etc.) after deploy

### Backend env

`backend/.env` is used by Docker Compose backend service. Update values as needed:
- `DATABASE_URL`
- `REDIS_URL`
- `ALCHEMY_MUMBAI_URL`
- `LOAN_FACTORY_ADDRESS`
- `SECRET_KEY`

### Frontend env

Create frontend env:

- macOS/Linux:
```bash
cp frontend/.env.example frontend/.env
```

- Windows PowerShell:
```powershell
Copy-Item frontend/.env.example frontend/.env
```

Key vars:
- `VITE_API_URL`
- `VITE_CHAIN_ID` (default: `80002` Amoy)
- `VITE_CHAIN_RPC`
- contract addresses (`VITE_LOAN_FACTORY`, `VITE_REPUTATION_NFT`, `VITE_MOCK_USDC`)

## 4) Quick Start (Recommended)

### Step A: Install JS dependencies

```bash
npm install
cd frontend && npm install
```

### Step B: Start infra + backend with Docker

From project root:

```bash
docker-compose up --build
```

Services:
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- FastAPI: `localhost:8000`

Health check:
- `GET http://localhost:8000/health`

### Step C: Start frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

Vite app will run on default local Vite port (usually `5173`).

## 5) Local Dev Without Docker (Optional)

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

### Root contracts

```bash
npm run compile
npm test
```

## 6) Blockchain Commands

From root:

```bash
npm run compile
npm test
npm run deploy:local
npm run deploy:mumbai
npm run seed:hardhat
npm run seed:local
```

Additional network (configured):

```bash
npx hardhat run scripts/deploy.js --network amoy
```

Note: deployment outputs are written under `deployments/`.

## 7) ML Workflow

From root:

```bash
python ml/generate_data.py
python ml/train.py
python ml/evaluate.py
```

Outputs:
- dataset: `ml/data/training.csv`
- model: `ml/models/credit_model.pkl`

## 8) API Overview

Base: `/api/v1`

- Loans: `/loans`
   - `GET /api/v1/loans/`
   - `POST /api/v1/loans/`
   - `POST /api/v1/loans/{loan_id}/fund`
   - `POST /api/v1/loans/{loan_id}/repay`
   - `POST /api/v1/loans/{loan_id}/default`
- Users: `/users`
   - `POST /api/v1/users/register`
   - `GET /api/v1/users/{wallet}`
- Credit: `/credit`
   - `POST /api/v1/credit/score`
- Community: `/community`
   - `GET /api/v1/community/vouch/{borrower_wallet}`
   - `POST /api/v1/community/vouch`
- Analytics: `/analytics`
   - `GET /api/v1/analytics/dashboard`
   - `GET /api/v1/analytics/overview`
   - `GET /api/v1/analytics/recent-events`

## 9) Project Structure (Current)

```text
HackNakshatra/
   backend/
   contracts/
   deployments/
   docs/
   frontend/
   ml/
   scripts/
   test/
   types/
   docker-compose.yml
   hardhat.config.ts
   package.json
   README.md
```

## 10) Troubleshooting

- If Hardhat deployment fails: verify `PRIVATE_KEY` and RPC vars in root `.env`.
- If frontend cannot fetch API: verify `VITE_API_URL` in `frontend/.env`.
- If backend credit endpoint is weak/noisy: ensure `ml/models/credit_model.pkl` exists.
- If Docker backend cannot load model: confirm volume mount `./ml/models:/app/ml/models` in `docker-compose.yml`.

## 11) Notes for Contributors

- Keep smart-contract changes paired with tests in `test/`.
- Keep frontend API calls under service modules, not directly in UI components.
- Keep secrets out of git; use `.env` files only.
- For historical merge rationale, see `docs/frontend-merge-report.md`.
