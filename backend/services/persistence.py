from __future__ import annotations

import logging
from datetime import UTC, datetime
from hashlib import sha1

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import (
    DB_AVAILABLE,
    CommunityVouchModel,
    LoanModel,
    RepaymentModel,
    SessionLocal,
    UserModel,
)
from models.schemas import LoanCreate, LoanResponse, UserResponse, VouchCreate

logger = logging.getLogger(__name__)

_MEM_LOANS: dict[int, LoanResponse] = {}
_MEM_NEXT_ID = 1
_MEM_METADATA: dict[int, dict[str, str]] = {}
_MEM_EVENTS: list[dict[str, object]] = []
_MEM_USERS: dict[str, UserResponse] = {}
_MEM_VOUCHES: dict[str, list[dict]] = {}
_MEM_VOUCH_NEXT = 1


def _pseudo_tx_hash(seed: str) -> str:
    return f"0x{sha1(seed.encode('utf-8')).hexdigest()[:40]}"


def _record_event(
    event_type: str,
    loan: LoanResponse,
    actor_wallet: str,
    amount_usdc: float | None = None,
) -> None:
    now = datetime.now(UTC)
    event_id_seed = f"{event_type}:{loan.id}:{actor_wallet}:{now.timestamp()}"
    _MEM_EVENTS.append(
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


def _loan_model_to_response(row: LoanModel) -> LoanResponse:
    return LoanResponse(
        id=row.id,
        borrower_wallet=row.borrower_wallet.lower(),
        lender_wallet=row.lender_wallet.lower() if row.lender_wallet else None,
        amount_usdc=float(row.amount_usdc),
        interest_rate=float(row.interest_rate),
        duration_days=row.duration_days,
        status=row.status,
        contract_address=row.contract_address,
        borrower_credit_score=row.borrower_credit_score,
        created_at=row.created_at,
    )


async def list_loans(
    session: AsyncSession | None,
    *,
    status: str | None = None,
    min_score: int | None = None,
    max_amount: float | None = None,
    borrower_wallet: str | None = None,
    lender_wallet: str | None = None,
    pending_unfunded_only: bool = False,
) -> list[LoanResponse]:
    if DB_AVAILABLE and session is not None:
        q = select(LoanModel)
        if status:
            q = q.where(LoanModel.status == status.upper())
        if min_score is not None:
            q = q.where(LoanModel.borrower_credit_score >= min_score)
        if max_amount is not None:
            q = q.where(LoanModel.amount_usdc <= max_amount)
        if borrower_wallet:
            q = q.where(LoanModel.borrower_wallet == borrower_wallet.lower())
        if lender_wallet:
            q = q.where(LoanModel.lender_wallet == lender_wallet.lower())
        if pending_unfunded_only:
            q = q.where(and_(LoanModel.status == "PENDING", LoanModel.lender_wallet.is_(None)))
        q = q.order_by(LoanModel.created_at.desc())
        res = await session.execute(q)
        rows = res.scalars().all()
        return [_loan_model_to_response(r) for r in rows]

    loans = list(_MEM_LOANS.values())
    if status:
        loans = [x for x in loans if x.status.lower() == status.lower()]
    if min_score is not None:
        loans = [x for x in loans if x.borrower_credit_score is not None and x.borrower_credit_score >= min_score]
    if max_amount is not None:
        loans = [x for x in loans if x.amount_usdc <= max_amount]
    if borrower_wallet:
        loans = [x for x in loans if x.borrower_wallet.lower() == borrower_wallet.lower()]
    if lender_wallet:
        loans = [x for x in loans if x.lender_wallet and x.lender_wallet.lower() == lender_wallet.lower()]
    if pending_unfunded_only:
        loans = [x for x in loans if x.status == "PENDING" and not x.lender_wallet]
    return sorted(loans, key=lambda x: x.created_at, reverse=True)


async def get_loan(session: AsyncSession | None, loan_id: int) -> LoanResponse | None:
    if DB_AVAILABLE and session is not None:
        row = await session.get(LoanModel, loan_id)
        return _loan_model_to_response(row) if row else None
    return _MEM_LOANS.get(loan_id)


async def upsert_loan_from_event(
    session: AsyncSession | None,
    loan_id: int,
    *,
    borrower_wallet: str,
    amount_usdc: float,
    interest_rate: float,
    duration_days: int,
    status: str,
    lender_wallet: str | None = None,
    guarantor_wallet: str | None = None,
    contract_address: str | None = None,
    borrower_did: str | None = None,
) -> LoanResponse:
    now = datetime.now(UTC)
    if DB_AVAILABLE and session is not None:
        existing = await session.get(LoanModel, loan_id)
        if existing:
            existing.borrower_wallet = borrower_wallet.lower()
            existing.amount_usdc = amount_usdc
            existing.interest_rate = interest_rate
            existing.duration_days = duration_days
            existing.status = status
            existing.updated_at = now
            if lender_wallet is not None:
                existing.lender_wallet = lender_wallet.lower()
            if guarantor_wallet is not None:
                existing.guarantor_wallet = guarantor_wallet.lower()
            if contract_address is not None:
                existing.contract_address = contract_address
            if borrower_did is not None:
                existing.borrower_did = borrower_did
            await session.commit()
            await session.refresh(existing)
            lr = _loan_model_to_response(existing)
        else:
            row = LoanModel(
                id=loan_id,
                borrower_wallet=borrower_wallet.lower(),
                lender_wallet=lender_wallet.lower() if lender_wallet else None,
                guarantor_wallet=guarantor_wallet.lower() if guarantor_wallet else None,
                amount_usdc=amount_usdc,
                interest_rate=interest_rate,
                duration_days=duration_days,
                status=status,
                contract_address=contract_address,
                borrower_credit_score=None,
                borrower_did=borrower_did,
                created_at=now,
                updated_at=now,
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            lr = _loan_model_to_response(row)
        return lr

    loan = LoanResponse(
        id=loan_id,
        borrower_wallet=borrower_wallet.lower(),
        lender_wallet=lender_wallet.lower() if lender_wallet else None,
        amount_usdc=amount_usdc,
        interest_rate=interest_rate,
        duration_days=duration_days,
        status=status,
        contract_address=contract_address,
        borrower_credit_score=None,
        created_at=now,
    )
    _MEM_LOANS[loan_id] = loan
    return loan


async def create_loan(session: AsyncSession | None, payload: LoanCreate) -> LoanResponse:
    global _MEM_NEXT_ID
    now = datetime.now(UTC)
    loan_id = payload.id if payload.id is not None else None

    if DB_AVAILABLE and session is not None:
        if loan_id is None:
            res = await session.execute(select(func.max(LoanModel.id)))
            mx = res.scalar()
            loan_id = int(mx or 0) + 1
        existing = await session.get(LoanModel, loan_id)
        if existing:
            raise ValueError("loan_id_exists")
        row = LoanModel(
            id=loan_id,
            borrower_wallet=payload.borrower_wallet.lower(),
            lender_wallet=None,
            guarantor_wallet=payload.guarantor_wallet.lower() if payload.guarantor_wallet else None,
            amount_usdc=payload.amount_usdc,
            interest_rate=payload.interest_rate,
            duration_days=payload.duration_days,
            status="PENDING",
            contract_address=payload.contract_address,
            borrower_credit_score=payload.borrower_credit_score,
            borrower_did=payload.borrower_did,
            purpose=payload.purpose,
            description=payload.description,
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        await session.commit()
        await session.refresh(row)
        lr = _loan_model_to_response(row)
        _record_event("LoanCreated", lr, lr.borrower_wallet, payload.amount_usdc)
        return lr

    if loan_id is None:
        loan_id = _MEM_NEXT_ID
        _MEM_NEXT_ID += 1
    elif loan_id in _MEM_LOANS:
        raise ValueError("loan_id_exists")

    loan = LoanResponse(
        id=loan_id,
        borrower_wallet=payload.borrower_wallet.lower(),
        lender_wallet=None,
        amount_usdc=payload.amount_usdc,
        interest_rate=payload.interest_rate,
        duration_days=payload.duration_days,
        status="PENDING",
        contract_address=payload.contract_address,
        borrower_credit_score=payload.borrower_credit_score,
        created_at=now,
    )
    _MEM_LOANS[loan_id] = loan
    _record_event("LoanCreated", loan, loan.borrower_wallet, payload.amount_usdc)
    return loan


async def fund_loan(session: AsyncSession | None, loan_id: int, lender_wallet: str) -> LoanResponse:
    loan = await get_loan(session, loan_id)
    if loan is None:
        raise LookupError("not_found")
    if loan.status != "PENDING":
        raise ValueError("bad_state")
    updated = loan.model_copy(
        update={"lender_wallet": lender_wallet.lower(), "status": "FUNDED_PENDING_ACTIVATION"}
    )
    if DB_AVAILABLE and session is not None:
        await session.execute(
            update(LoanModel)
            .where(LoanModel.id == loan_id)
            .values(
                lender_wallet=lender_wallet.lower(),
                status="FUNDED_PENDING_ACTIVATION",
                updated_at=datetime.now(UTC),
            )
        )
        await session.commit()
    else:
        _MEM_LOANS[loan_id] = updated
    _record_event("LoanFunded", updated, lender_wallet.lower(), loan.amount_usdc)
    return updated


async def activate_loan(session: AsyncSession | None, loan_id: int) -> LoanResponse:
    loan = await get_loan(session, loan_id)
    if loan is None:
        raise LookupError("not_found")
    if loan.status != "FUNDED_PENDING_ACTIVATION":
        raise ValueError("bad_state")
    updated = loan.model_copy(update={"status": "ACTIVE"})
    if DB_AVAILABLE and session is not None:
        await session.execute(
            update(LoanModel)
            .where(LoanModel.id == loan_id)
            .values(status="ACTIVE", updated_at=datetime.now(UTC))
        )
        await session.commit()
    else:
        _MEM_LOANS[loan_id] = updated
    _record_event("LoanActivated", updated, loan.borrower_wallet, loan.amount_usdc)
    return updated


async def repay_loan(session: AsyncSession | None, loan_id: int, amount_usdc: float, tx_hash: str | None = None) -> LoanResponse:
    loan = await get_loan(session, loan_id)
    if loan is None:
        raise LookupError("not_found")
    if loan.status not in {"ACTIVE", "REPAYING", "FUNDED_PENDING_ACTIVATION"}:
        raise ValueError("bad_state")
    next_status = "COMPLETED" if amount_usdc >= loan.amount_usdc else "REPAYING"
    updated = loan.model_copy(update={"status": next_status})
    now = datetime.now(UTC)
    if DB_AVAILABLE and session is not None:
        await session.execute(
            update(LoanModel)
            .where(LoanModel.id == loan_id)
            .values(status=next_status, updated_at=now)
        )
        session.add(RepaymentModel(loan_id=loan_id, amount_usdc=amount_usdc, tx_hash=tx_hash, created_at=now))
        await session.commit()
    else:
        _MEM_LOANS[loan_id] = updated
    _record_event("LoanRepaid", updated, loan.borrower_wallet, amount_usdc)
    return updated


async def default_loan(session: AsyncSession | None, loan_id: int) -> LoanResponse:
    loan = await get_loan(session, loan_id)
    if loan is None:
        raise LookupError("not_found")
    if loan.status not in {"ACTIVE", "REPAYING", "FUNDED_PENDING_ACTIVATION"}:
        raise ValueError("bad_state")
    updated = loan.model_copy(update={"status": "DEFAULTED"})
    if DB_AVAILABLE and session is not None:
        await session.execute(
            update(LoanModel)
            .where(LoanModel.id == loan_id)
            .values(status="DEFAULTED", updated_at=datetime.now(UTC))
        )
        await session.commit()
    else:
        _MEM_LOANS[loan_id] = updated
    _record_event("LoanDefaulted", updated, updated.lender_wallet or updated.borrower_wallet)
    return updated


async def save_metadata(session: AsyncSession | None, loan_id: int, purpose: str, description: str, ipfs_hash: str) -> dict:
    loan = await get_loan(session, loan_id)
    if loan is None:
        raise LookupError("not_found")
    meta = {"purpose": purpose, "description": description, "ipfs_hash": ipfs_hash}
    if DB_AVAILABLE and session is not None:
        await session.execute(
            update(LoanModel)
            .where(LoanModel.id == loan_id)
            .values(purpose=purpose, description=description, updated_at=datetime.now(UTC))
        )
        await session.commit()
    else:
        _MEM_METADATA[loan_id] = meta
    return {"loan_id": loan_id, "metadata": meta}


async def get_metadata(session: AsyncSession | None, loan_id: int) -> dict:
    loan = await get_loan(session, loan_id)
    if loan is None:
        raise LookupError("not_found")
    if DB_AVAILABLE and session is not None:
        row = await session.get(LoanModel, loan_id)
        meta = {
            "purpose": row.purpose or "",
            "description": row.description or "",
            "ipfs_hash": "",
        }
    else:
        meta = _MEM_METADATA.get(loan_id, {})
    return {"loan_id": loan_id, "metadata": meta}


def get_all_loans_sync() -> list[LoanResponse]:
    return list(_MEM_LOANS.values())


async def get_all_loans(session: AsyncSession | None) -> list[LoanResponse]:
    if DB_AVAILABLE:
        if session is None:
            async with SessionLocal() as s:
                res = await s.execute(select(LoanModel).order_by(LoanModel.created_at.desc()))
                return [_loan_model_to_response(r) for r in res.scalars().all()]
        res = await session.execute(select(LoanModel).order_by(LoanModel.created_at.desc()))
        return [_loan_model_to_response(r) for r in res.scalars().all()]
    return list(_MEM_LOANS.values())


def get_loan_events(limit: int = 50) -> list[dict[str, object]]:
    if limit <= 0:
        return []
    return _MEM_EVENTS[-limit:][::-1]


async def register_user(session: AsyncSession | None, wallet: str, did: str) -> UserResponse:
    w = wallet.lower()
    now = datetime.now(UTC)
    if DB_AVAILABLE and session is not None:
        res = await session.execute(select(UserModel).where(UserModel.wallet_address == w))
        if res.scalar_one_or_none():
            raise ValueError("exists")
        row = UserModel(wallet_address=w, did=did, credit_score=0, reputation_sbt_id=None, created_at=now)
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return UserResponse(
            wallet_address=row.wallet_address,
            did=row.did,
            credit_score=row.credit_score,
            reputation_sbt_id=row.reputation_sbt_id,
            created_at=row.created_at,
        )
    if w in _MEM_USERS:
        raise ValueError("exists")
    u = UserResponse(wallet_address=w, did=did, credit_score=0, reputation_sbt_id=None, created_at=now)
    _MEM_USERS[w] = u
    return u


async def get_user(session: AsyncSession | None, wallet: str) -> UserResponse | None:
    w = wallet.lower()
    if DB_AVAILABLE and session is not None:
        res = await session.execute(select(UserModel).where(UserModel.wallet_address == w))
        row = res.scalar_one_or_none()
        if not row:
            return None
        return UserResponse(
            wallet_address=row.wallet_address,
            did=row.did,
            credit_score=row.credit_score,
            reputation_sbt_id=row.reputation_sbt_id,
            created_at=row.created_at,
        )
    return _MEM_USERS.get(w)


async def add_vouch(session: AsyncSession | None, payload: VouchCreate, tx_hash: str | None = None) -> dict:
    global _MEM_VOUCH_NEXT
    borrower = payload.borrower_wallet.lower()
    voucher = payload.voucher_wallet.lower()
    now = datetime.now(UTC)
    if DB_AVAILABLE and session is not None:
        row = CommunityVouchModel(
            borrower_wallet=borrower,
            voucher_wallet=voucher,
            amount_usdc=payload.amount_usdc,
            loan_id=payload.loan_id,
            tx_hash=tx_hash,
            created_at=now,
        )
        session.add(row)
        await session.commit()
        await session.refresh(row)
        rid = row.id
    else:
        rid = _MEM_VOUCH_NEXT
        _MEM_VOUCH_NEXT += 1
        _MEM_VOUCHES.setdefault(borrower, []).append(
            {
                "id": rid,
                "voucher_wallet": voucher,
                "borrower_wallet": borrower,
                "amount_usdc": payload.amount_usdc,
                "loan_id": payload.loan_id,
                "tx_hash": tx_hash,
                "created_at": now,
            }
        )
    total = await vouch_totals(session, borrower)
    return {
        "id": rid,
        "voucher_wallet": voucher,
        "borrower_wallet": borrower,
        "amount_usdc": payload.amount_usdc,
        "loan_id": payload.loan_id,
        "tx_hash": tx_hash,
        "trust_summary": total,
    }


async def list_vouches(session: AsyncSession | None, borrower_wallet: str) -> list[dict]:
    b = borrower_wallet.lower()
    if DB_AVAILABLE and session is not None:
        res = await session.execute(
            select(CommunityVouchModel)
            .where(CommunityVouchModel.borrower_wallet == b)
            .order_by(CommunityVouchModel.created_at.desc())
        )
        out = []
        for r in res.scalars().all():
            out.append(
                {
                    "voucher_wallet": r.voucher_wallet,
                    "amount_usdc": float(r.amount_usdc),
                    "tx_hash": r.tx_hash or "",
                    "timestamp": int(r.created_at.timestamp()),
                    "loan_id": r.loan_id,
                }
            )
        return out
    return [
        {
            "voucher_wallet": x["voucher_wallet"],
            "amount_usdc": x["amount_usdc"],
            "tx_hash": x.get("tx_hash") or "",
            "timestamp": int(x["created_at"].timestamp()) if hasattr(x["created_at"], "timestamp") else 0,
            "loan_id": x.get("loan_id"),
        }
        for x in _MEM_VOUCHES.get(b, [])
    ]


async def vouch_totals(session: AsyncSession | None, borrower: str) -> dict:
    b = borrower.lower()
    if DB_AVAILABLE and session is not None:
        res = await session.execute(
            select(func.coalesce(func.sum(CommunityVouchModel.amount_usdc), 0), func.count()).where(
                CommunityVouchModel.borrower_wallet == b
            )
        )
        total, cnt = res.one()
        vouchers = await session.execute(
            select(func.count(func.distinct(CommunityVouchModel.voucher_wallet))).where(
                CommunityVouchModel.borrower_wallet == b
            )
        )
        active = int(vouchers.scalar() or 0)
        return {"total_staked_usdc": float(total), "active_vouchers": active}
    rows = _MEM_VOUCHES.get(b, [])
    return {
        "total_staked_usdc": sum(float(x["amount_usdc"]) for x in rows),
        "active_vouchers": len({x["voucher_wallet"] for x in rows}),
    }


async def pool_stats(session: AsyncSession | None) -> dict:
    if DB_AVAILABLE and session is not None:
        res = await session.execute(select(func.coalesce(func.sum(CommunityVouchModel.amount_usdc), 0)))
        total = float(res.scalar() or 0)
        res2 = await session.execute(select(func.count(func.distinct(CommunityVouchModel.voucher_wallet))))
        active = int(res2.scalar() or 0)
    else:
        total = sum(sum(float(v["amount_usdc"]) for v in lst) for lst in _MEM_VOUCHES.values())
        active = len({v["voucher_wallet"] for lst in _MEM_VOUCHES.values() for v in lst})
    return {
        "total_staked_usdc": round(total, 2),
        "defaults_covered": 0.0,
        "rewards_paid": 0.0,
        "active_vouchers": active,
    }


def append_loan_event(event: dict[str, object]) -> None:
    _MEM_EVENTS.append(event)
