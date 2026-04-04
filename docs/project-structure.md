# Project Structure (Current)

```text
HackNakshatra/
├── frontend/                # Final merged frontend (Vite + React)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── assets/
│   │   ├── styles/
│   │   ├── context/
│   │   └── abis/
│   ├── package.json
│   └── vite.config.js
├── backend/                 # FastAPI API layer
├── ml/                      # Data generation + model training/evaluation
├── contracts/               # Solidity contracts
├── scripts/                 # Deploy/seed scripts
├── test/                    # Contract tests
├── docs/                    # Architecture and merge documentation
├── docker-compose.yml
├── hardhat.config.ts
└── README.md
```

## Notes

- Blockchain sources remain in `contracts/` with Hardhat at root for compatibility with existing build/test scripts.
- Frontend integration targets backend routes under `/api/v1/*`.
- Backend analytics endpoints provide dashboard data consumed by the merged frontend.
