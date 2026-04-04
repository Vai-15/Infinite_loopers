from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WalletModel(BaseModel):
    wallet_address: str

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet(cls, value: str) -> str:
        normalized = value.lower()
        if not normalized.startswith("0x") or len(normalized) != 42:
            raise ValueError("wallet_address must be a valid EVM address")
        return normalized


class UserCreate(WalletModel):
    did: str | None = None
    display_name: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    wallet_address: str
    did: str
    credit_score: int = 0
    reputation_sbt_id: int | None = None
    created_at: datetime


class LoanCreate(BaseModel):
    id: int | None = Field(default=None, ge=1, description="On-chain loan id when synced from factory")
    borrower_wallet: str = Field(..., min_length=42, max_length=42)
    guarantor_wallet: str | None = Field(default=None, min_length=42, max_length=42)
    borrower_did: str | None = None
    contract_address: str | None = Field(default=None, min_length=42, max_length=42)
    amount_usdc: float = Field(..., gt=0)
    interest_rate: float = Field(..., gt=0)
    duration_days: int = Field(..., ge=1)
    purpose: str | None = None
    description: str | None = None
    borrower_credit_score: int | None = Field(default=None, ge=300, le=850)


class LoanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    borrower_wallet: str
    lender_wallet: str | None = None
    amount_usdc: float
    interest_rate: float
    duration_days: int
    status: str
    contract_address: str | None = None
    borrower_credit_score: int | None = None
    created_at: datetime


class CreditScoreRequest(BaseModel):
    wallet_address: str = Field(..., min_length=42, max_length=42)
    features: dict[str, float] | None = None
    wallet_age_days: float | None = None
    num_transactions: float | None = None
    avg_tx_value_usd: float | None = None
    num_previous_loans: float | None = None
    repayment_rate: float | None = None
    default_count: float | None = None
    community_vouches: float | None = None
    monthly_income_usd: float | None = None
    days_employed: float | None = None


class CreditScoreResponse(BaseModel):
    score: int = Field(..., ge=300, le=850)
    risk_level: str
    confidence: float = Field(..., ge=0, le=1)
    top_factors: list[str]


class VouchCreate(BaseModel):
    voucher_wallet: str = Field(..., min_length=42, max_length=42)
    borrower_wallet: str = Field(..., min_length=42, max_length=42)
    amount_usdc: float = Field(..., gt=0)
    loan_id: int | None = Field(default=None, ge=1)
