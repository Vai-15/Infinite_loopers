from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import VouchCreate
from services import persistence

router = APIRouter(prefix="/api/v1/community", tags=["community"])


class VouchApiBody(BaseModel):
    borrower_wallet: str = Field(..., min_length=42, max_length=42)
    voucher_wallet: str = Field(..., min_length=42, max_length=42)
    amount_usdc: float = Field(..., gt=0)
    loan_id: int | None = Field(default=None, ge=1)
    tx_hash: str | None = Field(default=None, max_length=66)


@router.get("/vouch/{borrower_wallet}")
async def get_vouches_legacy(borrower_wallet: str, db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = await persistence.list_vouches(db, borrower_wallet)
    return [
        {
            "id": i + 1,
            "voucher_wallet": r["voucher_wallet"],
            "borrower_wallet": borrower_wallet.lower(),
            "amount_usdc": r["amount_usdc"],
            "loan_id": r.get("loan_id"),
            "created_at": datetime.fromtimestamp(r["timestamp"], tz=UTC) if r.get("timestamp") else datetime.now(UTC),
        }
        for i, r in enumerate(rows)
    ]


@router.get("/vouches/{borrower_wallet}")
async def get_vouches(borrower_wallet: str, db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await persistence.list_vouches(db, borrower_wallet)


@router.post("/vouch")
async def add_vouch(payload: VouchCreate, db: AsyncSession = Depends(get_db)) -> dict:
    try:
        return await persistence.add_vouch(db, payload, tx_hash=None)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/vouch/detailed")
async def add_vouch_detailed(payload: VouchApiBody, db: AsyncSession = Depends(get_db)) -> dict:
    vc = VouchCreate(
        voucher_wallet=payload.voucher_wallet,
        borrower_wallet=payload.borrower_wallet,
        amount_usdc=payload.amount_usdc,
        loan_id=payload.loan_id,
    )
    return await persistence.add_vouch(db, vc, tx_hash=payload.tx_hash)


@router.get("/pool/stats")
async def pool_stats(db: AsyncSession = Depends(get_db)) -> dict:
    return await persistence.pool_stats(db)
