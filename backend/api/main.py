from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import analytics, community, credit, loans, users
from models.database import init_database
from services.event_sync import listener_loop

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.started_at = datetime.now(UTC)
    await init_database()
    stop = asyncio.Event()
    app.state.chain_listener_stop = stop
    app.state.chain_listener_task = asyncio.create_task(listener_loop(stop))
    yield
    stop.set()
    task = getattr(app.state, "chain_listener_task", None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
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
