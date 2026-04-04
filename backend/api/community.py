from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

from models.schemas import VouchCreate

router = APIRouter(prefix="/api/v1/community", tags=["community"])


class VouchResponse(BaseModel):
    id: int
    voucher_wallet: str
    borrower_wallet: str
    amount_usdc: float
    loan_id: int | None = None
    created_at: datetime


_VOUCHES: dict[str, list[VouchResponse]] = {}
_NEXT_VOUCH_ID = 1


@router.get("/vouch/{borrower_wallet}", response_model=list[VouchResponse])
async def get_vouches_for_borrower(borrower_wallet: str) -> list[VouchResponse]:
    return _VOUCHES.get(borrower_wallet.lower(), [])


@router.post("/vouch", response_model=VouchResponse)
async def add_vouch(payload: VouchCreate) -> VouchResponse:
    global _NEXT_VOUCH_ID

    borrower = payload.borrower_wallet.lower()
    voucher = payload.voucher_wallet.lower()
    response = VouchResponse(
        id=_NEXT_VOUCH_ID,
        voucher_wallet=voucher,
        borrower_wallet=borrower,
        amount_usdc=payload.amount_usdc,
        loan_id=payload.loan_id,
        created_at=datetime.now(UTC),
    )
    _NEXT_VOUCH_ID += 1

    _VOUCHES.setdefault(borrower, []).append(response)
    return response
