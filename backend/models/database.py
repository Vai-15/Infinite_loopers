from __future__ import annotations

import logging
import os
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://admin:hackathon2024@localhost:5432/decentra_lend",
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

DB_AVAILABLE = False


class Base(DeclarativeBase):
    pass


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wallet_address: Mapped[str] = mapped_column(String(42), unique=True, index=True)
    did: Mapped[str] = mapped_column(Text)
    credit_score: Mapped[int] = mapped_column(Integer, default=0)
    reputation_sbt_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class LoanModel(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    borrower_wallet: Mapped[str] = mapped_column(String(42), index=True)
    lender_wallet: Mapped[str | None] = mapped_column(String(42), nullable=True)
    guarantor_wallet: Mapped[str | None] = mapped_column(String(42), nullable=True)
    amount_usdc: Mapped[float] = mapped_column(Numeric(24, 6))
    interest_rate: Mapped[float] = mapped_column(Numeric(12, 4))
    duration_days: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), index=True)
    contract_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    borrower_credit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    borrower_did: Mapped[str | None] = mapped_column(Text, nullable=True)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    repayments: Mapped[list[RepaymentModel]] = relationship(back_populates="loan", cascade="all, delete-orphan")


class RepaymentModel(Base):
    __tablename__ = "repayments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    loan_id: Mapped[int] = mapped_column(ForeignKey("loans.id", ondelete="CASCADE"), index=True)
    amount_usdc: Mapped[float] = mapped_column(Numeric(24, 6))
    tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    loan: Mapped[LoanModel] = relationship(back_populates="repayments")


class CommunityVouchModel(Base):
    __tablename__ = "community_vouches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    borrower_wallet: Mapped[str] = mapped_column(String(42), index=True)
    voucher_wallet: Mapped[str] = mapped_column(String(42), index=True)
    amount_usdc: Mapped[float] = mapped_column(Numeric(24, 6))
    loan_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


async def init_database() -> None:
    global DB_AVAILABLE
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        DB_AVAILABLE = True
        logger.info("Database initialized (SQLAlchemy create_all OK)")
    except Exception as exc:
        DB_AVAILABLE = False
        logger.warning("Database unavailable, using in-memory fallback: %s", exc)


async def get_db() -> AsyncGenerator[AsyncSession | None, None]:
    if not DB_AVAILABLE:
        yield None
        return
    async with SessionLocal() as session:
        yield session
