from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from services import persistence

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def _status_breakdown(loans):
    counts: dict[str, int] = defaultdict(int)
    for loan in loans:
        counts[loan.status] += 1
    return [{"status": status, "count": count} for status, count in sorted(counts.items())]


def _duration_buckets(loans):
    buckets = {
        "0-14": 0,
        "15-30": 0,
        "31-60": 0,
        "61-90": 0,
        "90+": 0,
    }
    for loan in loans:
        d = loan.duration_days
        if d <= 14:
            buckets["0-14"] += 1
        elif d <= 30:
            buckets["15-30"] += 1
        elif d <= 60:
            buckets["31-60"] += 1
        elif d <= 90:
            buckets["61-90"] += 1
        else:
            buckets["90+"] += 1
    return [{"bucket": k, "count": v} for k, v in buckets.items()]


def _trust_distribution(loans):
    buckets = {
        "300-450": 0,
        "451-600": 0,
        "601-750": 0,
        "751-850": 0,
    }
    for loan in loans:
        score = loan.borrower_credit_score or 0
        if 300 <= score <= 450:
            buckets["300-450"] += 1
        elif 451 <= score <= 600:
            buckets["451-600"] += 1
        elif 601 <= score <= 750:
            buckets["601-750"] += 1
        elif 751 <= score <= 850:
            buckets["751-850"] += 1
    return [{"range": k, "count": v} for k, v in buckets.items()]


def _overview_dict(loans: list) -> dict[str, object]:
    total_loans = len(loans)
    total_volume = round(sum(loan.amount_usdc for loan in loans), 2)
    defaulted = len([loan for loan in loans if loan.status == "DEFAULTED"])
    default_rate = round((defaulted / total_loans) * 100, 2) if total_loans else 0.0

    scores = [loan.borrower_credit_score for loan in loans if loan.borrower_credit_score is not None]
    avg_trust_score = round(sum(scores) / len(scores), 2) if scores else 0.0

    return {
        "totalLoans": total_loans,
        "totalVolume": total_volume,
        "defaultRate": default_rate,
        "avgTrustScore": avg_trust_score,
    }


@router.get("/summary")
async def analytics_summary(db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    loans = await persistence.get_all_loans(db)
    total_volume = round(sum(loan.amount_usdc for loan in loans), 2)
    scores = [loan.borrower_credit_score for loan in loans if loan.borrower_credit_score is not None]
    avg_credit = round(sum(scores) / len(scores), 2) if scores else 0.0
    defaulted = len([l for l in loans if l.status == "DEFAULTED"])
    dr = round((defaulted / len(loans)) * 100, 2) if loans else 0.0
    return {
        "tvl_usdc": total_volume,
        "total_loans": len(loans),
        "avg_credit_score": avg_credit,
        "default_rate_pct": dr,
    }


@router.get("/volume")
async def analytics_volume(days: int = Query(default=30, ge=1, le=365), db: AsyncSession = Depends(get_db)) -> list[dict]:
    loans = await persistence.get_all_loans(db)
    now = datetime.now(UTC).date()
    out: list[dict] = []
    for i in range(days - 1, -1, -1):
        day = now - timedelta(days=i)
        ds = day.isoformat()
        vol = sum(l.amount_usdc for l in loans if l.created_at.date() == day)
        cnt = len([l for l in loans if l.created_at.date() == day])
        out.append({"date": ds, "loans_issued": cnt, "volume_usdc": round(vol, 2)})
    return out


@router.get("/distribution")
async def analytics_distribution(db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    loans = await persistence.get_all_loans(db)
    return {
        "credit_score_bands": _trust_distribution(loans),
        "loan_status": _status_breakdown(loans),
    }


@router.get("/feed")
async def analytics_feed(limit: int = Query(default=10, ge=1, le=50)) -> list[dict[str, object]]:
    return persistence.get_loan_events(limit)


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    loans = await persistence.get_all_loans(db)
    return _overview_dict(loans)


@router.get("/dashboard")
async def get_dashboard(db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    loans = await persistence.get_all_loans(db)
    return {
        "overview": _overview_dict(loans),
        "statusBreakdown": _status_breakdown(loans),
        "durationBuckets": _duration_buckets(loans),
        "trustDistribution": _trust_distribution(loans),
    }


@router.get("/topBorrowers")
async def get_top_borrowers(limit: int = Query(default=5, ge=1, le=20), db: AsyncSession = Depends(get_db)) -> list[dict]:
    loans = await persistence.get_all_loans(db)
    stats: dict[str, dict[str, object]] = {}

    for loan in loans:
        row = stats.setdefault(
            loan.borrower_wallet,
            {
                "address": loan.borrower_wallet,
                "score": loan.borrower_credit_score or 0,
                "repaidLoans": 0,
                "defaultedLoans": 0,
                "borrowedVolume": 0.0,
            },
        )
        row["borrowedVolume"] = round(float(row["borrowedVolume"]) + loan.amount_usdc, 2)
        if loan.status == "COMPLETED":
            row["repaidLoans"] = int(row["repaidLoans"]) + 1
        if loan.status == "DEFAULTED":
            row["defaultedLoans"] = int(row["defaultedLoans"]) + 1

    ranked = sorted(stats.values(), key=lambda x: (x["score"], x["borrowedVolume"]), reverse=True)
    return ranked[:limit]


@router.get("/topLenders")
async def get_top_lenders(limit: int = Query(default=5, ge=1, le=20), db: AsyncSession = Depends(get_db)) -> list[dict]:
    loans = [loan for loan in await persistence.get_all_loans(db) if loan.lender_wallet]
    stats: dict[str, dict[str, object]] = {}

    for loan in loans:
        lender = loan.lender_wallet or ""
        row = stats.setdefault(
            lender,
            {
                "address": lender,
                "totalEth": 0.0,
                "activeLoans": 0,
                "earnedInterest": 0.0,
            },
        )
        row["totalEth"] = round(float(row["totalEth"]) + loan.amount_usdc, 2)
        if loan.status in {"ACTIVE", "REPAYING", "FUNDED_PENDING_ACTIVATION"}:
            row["activeLoans"] = int(row["activeLoans"]) + 1
        if loan.status == "COMPLETED":
            row["earnedInterest"] = round(
                float(row["earnedInterest"]) + (loan.amount_usdc * (loan.interest_rate / 100)),
                2,
            )

    ranked = sorted(stats.values(), key=lambda x: (x["totalEth"], x["earnedInterest"]), reverse=True)
    return ranked[:limit]


@router.get("/recent-events")
async def get_recent_events(limit: int = Query(default=10, ge=1, le=50)) -> list[dict[str, object]]:
    return persistence.get_loan_events(limit)
