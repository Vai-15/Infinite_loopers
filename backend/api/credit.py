from __future__ import annotations

import json
import logging
import os
from fastapi import APIRouter

from models.schemas import CreditScoreRequest, CreditScoreResponse
from services.blockchain import BlockchainService
from services.credit_service import CreditService

router = APIRouter(prefix="/api/v1/credit", tags=["credit"])
logger = logging.getLogger(__name__)

_credit_service = CreditService()
_blockchain_service = BlockchainService()

_REDIS = None
try:
    import redis.asyncio as redis_async

    _ru = os.getenv("REDIS_URL")
    if _ru:
        _REDIS = redis_async.from_url(_ru, decode_responses=True)
except Exception:
    _REDIS = None

FEATURE_KEYS = (
    "wallet_age_days",
    "num_transactions",
    "avg_tx_value_usd",
    "num_previous_loans",
    "repayment_rate",
    "default_count",
    "community_vouches",
    "monthly_income_usd",
    "days_employed",
)


def _build_features(payload: CreditScoreRequest) -> dict[str, float]:
    if payload.features:
        return {k: float(v) for k, v in payload.features.items()}
    out: dict[str, float] = {}
    for k in FEATURE_KEYS:
        v = getattr(payload, k, None)
        if v is not None:
            out[k] = float(v)
    if "num_transactions" not in out:
        tx_count = _blockchain_service.get_wallet_tx_count(payload.wallet_address)
        out["num_transactions"] = float(tx_count)
    defaults: dict[str, float] = {
        "wallet_age_days": 180.0,
        "num_transactions": out.get("num_transactions", 5.0),
        "avg_tx_value_usd": 100.0,
        "num_previous_loans": 0.0,
        "repayment_rate": 0.65,
        "default_count": 0.0,
        "community_vouches": 0.0,
        "monthly_income_usd": 3000.0,
        "days_employed": 365.0,
    }
    for k, dv in defaults.items():
        out.setdefault(k, dv)
    return out


@router.post("/score", response_model=CreditScoreResponse)
async def score_credit(payload: CreditScoreRequest) -> CreditScoreResponse:
    wallet = payload.wallet_address.lower()
    cache_key = f"credit:{wallet}"
    if _REDIS is not None:
        try:
            cached = await _REDIS.get(cache_key)
            if cached:
                data = json.loads(cached)
                return CreditScoreResponse(**data)
        except Exception:
            pass

    features = _build_features(payload)
    prediction = _credit_service.predict(features)
    resp = CreditScoreResponse(**prediction)

    if _REDIS is not None:
        try:
            await _REDIS.set(cache_key, json.dumps(resp.model_dump()), ex=300)
        except Exception:
            pass

    return resp
