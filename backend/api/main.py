from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import analytics, community, credit, loans, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.started_at = datetime.now(UTC)
    yield
    app.state.stopped_at = datetime.now(UTC)


app = FastAPI(title="DecentraLend API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(loans.router)
app.include_router(users.router)
app.include_router(credit.router)
app.include_router(community.router)
app.include_router(analytics.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "decentra-lend-api"}
