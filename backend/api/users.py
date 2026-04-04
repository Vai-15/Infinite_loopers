from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import LoanResponse, UserCreate, UserResponse
from services import persistence
from services.credit_service import CreditService
from services.did_service import generate_did

router = APIRouter(prefix="/api/v1/users", tags=["users"])

_credit = CreditService()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> UserResponse:
    wallet = payload.wallet_address.lower()
    try:
        did = payload.did or generate_did(wallet)
        return await persistence.register_user(db, wallet, did)
    except ValueError as exc:
        if str(exc) == "exists":
            raise HTTPException(status_code=409, detail="User already registered") from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{wallet}", response_model=UserResponse)
async def get_user(wallet: str, db: AsyncSession = Depends(get_db)) -> UserResponse:
    user = await persistence.get_user(db, wallet)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    feat = {
        "wallet_age_days": 365.0,
        "num_transactions": 12.0,
        "avg_tx_value_usd": 250.0,
        "num_previous_loans": 0.0,
        "repayment_rate": 0.75,
        "default_count": 0.0,
        "community_vouches": 3.0,
        "monthly_income_usd": 4000.0,
        "days_employed": 400.0,
    }
    pred = _credit.predict(feat)
    return user.model_copy(update={"credit_score": int(pred["score"])})


@router.get("/{wallet}/history", response_model=list[LoanResponse])
async def user_history(wallet: str, db: AsyncSession = Depends(get_db)) -> list[LoanResponse]:
    return await persistence.list_loans(db, borrower_wallet=wallet)
