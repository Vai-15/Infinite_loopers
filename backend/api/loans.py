from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha1

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import LoanCreate, LoanResponse

router = APIRouter(prefix="/api/v1/loans", tags=["loans"])

_LOANS: dict[int, LoanResponse] = {}
_NEXT_LOAN_ID = 1
_LOAN_METADATA: dict[int, dict[str, str]] = {}
_EVENTS: list[dict[str, object]] = []


class FundRequest(BaseModel):
    lender_wallet: str = Field(..., min_length=42, max_length=42)


class RepayRequest(BaseModel):
    amount_usdc: float = Field(..., gt=0)


class MetadataRequest(BaseModel):
    purpose: str = Field(..., min_length=2, max_length=120)
    description: str = Field(..., min_length=2, max_length=500)
    ipfs_hash: str | None = Field(default=None, max_length=200)


def _pseudo_tx_hash(seed: str) -> str:
    digest = sha1(seed.encode("utf-8")).hexdigest()
    return f"0x{digest[:40]}"


def _record_event(
    event_type: str,
    loan: LoanResponse,
    actor_wallet: str,
    amount_usdc: float | None = None,
) -> None:
    now = datetime.now(UTC)
    event_id_seed = f"{event_type}:{loan.id}:{actor_wallet}:{now.timestamp()}"
    _EVENTS.append(
        {
            "id": _pseudo_tx_hash(event_id_seed),
            "eventType": event_type,
            "loanId": loan.id,
            "address": actor_wallet,
            "amount": amount_usdc if amount_usdc is not None else loan.amount_usdc,
            "timestamp": int(now.timestamp()),
            "txHash": _pseudo_tx_hash(f"tx:{event_id_seed}"),
        }
    )


def get_all_loans() -> list[LoanResponse]:
    return list(_LOANS.values())


def get_loan_events(limit: int = 50) -> list[dict[str, object]]:
    if limit <= 0:
        return []
    return _EVENTS[-limit:][::-1]


@router.get("/", response_model=list[LoanResponse])
async def list_loans(
    status: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=300, le=850),
    max_amount: float | None = Query(default=None, gt=0),
    borrower_wallet: str | None = Query(default=None),
    lender_wallet: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[LoanResponse]:
    del db
    loans = list(_LOANS.values())
    if status:
        loans = [loan for loan in loans if loan.status.lower() == status.lower()]
    if min_score is not None:
        loans = [
            loan
            for loan in loans
            if loan.borrower_credit_score is not None and loan.borrower_credit_score >= min_score
        ]
    if max_amount is not None:
        loans = [loan for loan in loans if loan.amount_usdc <= max_amount]
    if borrower_wallet:
        loans = [
            loan
            for loan in loans
            if loan.borrower_wallet.lower() == borrower_wallet.lower()
        ]
    if lender_wallet:
        loans = [
            loan
            for loan in loans
            if loan.lender_wallet and loan.lender_wallet.lower() == lender_wallet.lower()
        ]
    return loans


@router.post("/", response_model=LoanResponse)
async def create_loan(payload: LoanCreate, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    del db
    global _NEXT_LOAN_ID
    loan_id = _NEXT_LOAN_ID
    _NEXT_LOAN_ID += 1

    loan = LoanResponse(
        id=loan_id,
        borrower_wallet=payload.borrower_wallet.lower(),
        lender_wallet=None,
        amount_usdc=payload.amount_usdc,
        interest_rate=payload.interest_rate,
        duration_days=payload.duration_days,
        status="PENDING",
        contract_address=f"0x{loan_id:040x}",
        borrower_credit_score=payload.borrower_credit_score,
        created_at=datetime.now(UTC),
    )
    _LOANS[loan_id] = loan
    _record_event("LoanCreated", loan, loan.borrower_wallet, payload.amount_usdc)
    return loan


@router.get("/{loan_id}", response_model=LoanResponse)
async def get_loan(loan_id: int, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    del db
    loan = _LOANS.get(loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan


@router.post("/{loan_id}/fund", response_model=LoanResponse)
async def fund_loan(
    loan_id: int,
    payload: FundRequest,
    db: AsyncSession = Depends(get_db),
) -> LoanResponse:
    del db
    loan = _LOANS.get(loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "PENDING":
        raise HTTPException(status_code=400, detail="Only pending loans can be funded")

    updated = loan.model_copy(update={"lender_wallet": payload.lender_wallet.lower(), "status": "ACTIVE"})
    _LOANS[loan_id] = updated
    _record_event("LoanFunded", updated, payload.lender_wallet.lower(), loan.amount_usdc)
    return updated


@router.post("/{loan_id}/repay", response_model=LoanResponse)
async def repay_loan(
    loan_id: int,
    payload: RepayRequest,
    db: AsyncSession = Depends(get_db),
) -> LoanResponse:
    del db
    loan = _LOANS.get(loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status not in {"ACTIVE", "REPAYING"}:
        raise HTTPException(status_code=400, detail="Loan is not in a repayable state")

    next_status = "COMPLETED" if payload.amount_usdc >= loan.amount_usdc else "REPAYING"
    updated = loan.model_copy(update={"status": next_status})
    _LOANS[loan_id] = updated
    _record_event("LoanRepaid", updated, loan.borrower_wallet, payload.amount_usdc)
    return updated


@router.post("/{loan_id}/default", response_model=LoanResponse)
async def mark_default(loan_id: int, db: AsyncSession = Depends(get_db)) -> LoanResponse:
    del db
    loan = _LOANS.get(loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status not in {"ACTIVE", "REPAYING"}:
        raise HTTPException(status_code=400, detail="Only active/repaying loans can be defaulted")

    updated = loan.model_copy(update={"status": "DEFAULTED"})
    _LOANS[loan_id] = updated
    _record_event("LoanDefaulted", updated, updated.lender_wallet or updated.borrower_wallet)
    return updated


@router.post("/{loan_id}/metadata")
async def upsert_metadata(
    loan_id: int,
    payload: MetadataRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    del db
    if loan_id not in _LOANS:
        raise HTTPException(status_code=404, detail="Loan not found")
    _LOAN_METADATA[loan_id] = {
        "purpose": payload.purpose,
        "description": payload.description,
        "ipfs_hash": payload.ipfs_hash or "",
    }
    return {"loan_id": loan_id, "metadata": _LOAN_METADATA[loan_id]}


@router.get("/{loan_id}/metadata")
async def get_metadata(loan_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    del db
    if loan_id not in _LOANS:
        raise HTTPException(status_code=404, detail="Loan not found")
    return {"loan_id": loan_id, "metadata": _LOAN_METADATA.get(loan_id, {})}
