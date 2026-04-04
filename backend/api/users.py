from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import UserCreate, UserResponse
from services.did_service import generate_did

router = APIRouter(prefix="/api/v1/users", tags=["users"])

_USERS: dict[str, UserResponse] = {}


@router.post("/register", response_model=UserResponse)
async def register_user(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> UserResponse:
    del db
    wallet = payload.wallet_address.lower()
    if wallet in _USERS:
        raise HTTPException(status_code=409, detail="User already registered")

    did = payload.did or generate_did(wallet)
    user = UserResponse(
        wallet_address=wallet,
        did=did,
        credit_score=0,
        reputation_sbt_id=None,
        created_at=datetime.now(UTC),
    )
    _USERS[wallet] = user
    return user


@router.get("/{wallet}", response_model=UserResponse)
async def get_user(wallet: str, db: AsyncSession = Depends(get_db)) -> UserResponse:
    del db
    user = _USERS.get(wallet.lower())
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
