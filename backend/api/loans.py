from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import LoanCreate, LoanResponse
from services import persistence

router = APIRouter(prefix="/api/v1/loans", tags=["loans"])


class FundRequest(BaseModel):
    lender_wallet: str = Field(..., min_length=42, max_length=42)


class RepayRequest(BaseModel):
    amount_usdc: float = Field(..., gt=0)
    tx_hash: str | None = Field(default=None, max_length=66)


class MetadataRequest(BaseModel):
    purpose: str = Field(..., min_length=2, max_length=120)
    description: str = Field(..., min_length=2, max_length=500)
    ipfs_hash: str | None = Field(default=None, max_length=200)


@router.get("/", response_model=list[LoanResponse])
async def list_loans(
    status: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=300, le=850),
    max_amount: float | None = Query(default=None, gt=0),
    borrower_wallet: str | None = Query(default=None),
    lender_wallet: str | None = Query(default=None),
    marketplace: bool = Query(
        default=False,
        description="If true, only unfunded PENDING loans (for lender marketplace)",
    ),
    db: AsyncSession = Depends(get_db),
) -> list[LoanResponse]:
    return await persistence.list_loans(
        db,
        status=status,
        min_score=min_score,
        max_amount=max_amount,
        borrower_wallet=borrower_wallet,
        lender_wallet=lender_wallet,
        pending_unfunded_only=marketplace,
    )


@router.post("/", response_model=LoanResponse, status_code=201)
async def create_loan(payload: LoanCreate, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    try:
        return await persistence.create_loan(db, payload)
    except ValueError as exc:
        if str(exc) == "loan_id_exists":
            raise HTTPException(status_code=409, detail="loan_id already exists") from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{loan_id}", response_model=LoanResponse)
async def get_loan(loan_id: int, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    loan = await persistence.get_loan(db, loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan


@router.post("/{loan_id}/fund", response_model=LoanResponse)
async def fund_loan(loan_id: int, payload: FundRequest, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    try:
        return await persistence.fund_loan(db, loan_id, payload.lender_wallet)
    except LookupError:
        raise HTTPException(status_code=404, detail="Loan not found") from None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{loan_id}/activate", response_model=LoanResponse)
async def activate_loan(loan_id: int, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    try:
        return await persistence.activate_loan(db, loan_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Loan not found") from None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{loan_id}/repay", response_model=LoanResponse)
async def repay_loan(loan_id: int, payload: RepayRequest, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    try:
        return await persistence.repay_loan(db, loan_id, payload.amount_usdc, payload.tx_hash)
    except LookupError:
        raise HTTPException(status_code=404, detail="Loan not found") from None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{loan_id}/default", response_model=LoanResponse)
async def mark_default(loan_id: int, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    try:
        return await persistence.default_loan(db, loan_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Loan not found") from None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{loan_id}/metadata")
async def upsert_metadata(loan_id: int, payload: MetadataRequest, db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    try:
        return await persistence.save_metadata(
            db, loan_id, payload.purpose, payload.description, payload.ipfs_hash or ""
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Loan not found") from None


@router.get("/{loan_id}/metadata")
async def get_metadata(loan_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    try:
        return await persistence.get_metadata(db, loan_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Loan not found") from None
