from __future__ import annotations

from fastapi import APIRouter

from models.schemas import CreditScoreRequest, CreditScoreResponse
from services.blockchain import BlockchainService
from services.credit_service import CreditService

router = APIRouter(prefix="/api/v1/credit", tags=["credit"])

_credit_service = CreditService()
_blockchain_service = BlockchainService()


@router.post("/score", response_model=CreditScoreResponse)
async def score_credit(payload: CreditScoreRequest) -> CreditScoreResponse:
    features = dict(payload.features)
    if "num_transactions" not in features:
        tx_count = _blockchain_service.get_wallet_tx_count(payload.wallet_address)
        features["num_transactions"] = float(tx_count)

    prediction = _credit_service.predict(features)
    return CreditScoreResponse(**prediction)
