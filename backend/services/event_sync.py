from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from web3 import Web3

from models.database import DB_AVAILABLE, SessionLocal
from services import persistence

logger = logging.getLogger(__name__)

_STATE_FILE = Path(__file__).resolve().parent.parent / ".last_chain_block"


def _factory_abi() -> list:
    root = Path(__file__).resolve().parents[2]
    art = root / "artifacts/contracts/LoanFactory.sol/LoanFactory.json"
    if art.exists():
        return json.loads(art.read_text(encoding="utf-8"))["abi"]
    return [
        {
            "anonymous": False,
            "inputs": [
                {"indexed": True, "internalType": "uint256", "name": "loanId", "type": "uint256"},
                {"indexed": True, "internalType": "address", "name": "borrower", "type": "address"},
                {"indexed": False, "internalType": "uint256", "name": "principal", "type": "uint256"},
                {"indexed": False, "internalType": "uint256", "name": "aprBPS", "type": "uint256"},
                {"indexed": False, "internalType": "uint256", "name": "termDays", "type": "uint256"},
                {"indexed": False, "internalType": "address", "name": "guarantor", "type": "address"},
            ],
            "name": "LoanRequested",
            "type": "event",
        },
        {
            "anonymous": False,
            "inputs": [
                {"indexed": True, "internalType": "uint256", "name": "loanId", "type": "uint256"},
                {"indexed": True, "internalType": "address", "name": "lender", "type": "address"},
                {"indexed": False, "internalType": "uint256", "name": "principal", "type": "uint256"},
                {"indexed": False, "internalType": "uint256", "name": "guarantorStake", "type": "uint256"},
            ],
            "name": "LoanFunded",
            "type": "event",
        },
        {
            "anonymous": False,
            "inputs": [
                {"indexed": True, "internalType": "uint256", "name": "loanId", "type": "uint256"},
                {"indexed": True, "internalType": "address", "name": "borrower", "type": "address"},
            ],
            "name": "LoanCompleted",
            "type": "event",
        },
        {
            "anonymous": False,
            "inputs": [
                {"indexed": True, "internalType": "uint256", "name": "loanId", "type": "uint256"},
                {"indexed": True, "internalType": "address", "name": "borrower", "type": "address"},
            ],
            "name": "LoanDefaulted",
            "type": "event",
        },
        {
            "inputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
            "name": "getLoanAgreement",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function",
        },
    ]


def _read_last_block() -> int:
    try:
        if _STATE_FILE.exists():
            return int(_STATE_FILE.read_text(encoding="utf-8").strip())
    except (ValueError, OSError):
        pass
    return 0


def _write_last_block(block_num: int) -> None:
    try:
        _STATE_FILE.write_text(str(block_num), encoding="utf-8")
    except OSError:
        pass


def _append_feed(event_type: str, loan_id: int, address: str, amount: float | None, tx_hash: str) -> None:
    now = int(datetime.now(UTC).timestamp())
    persistence.append_loan_event(
        {
            "id": tx_hash[:18] if tx_hash else str(now),
            "eventType": event_type,
            "loanId": loan_id,
            "address": address.lower(),
            "amount": amount,
            "timestamp": now,
            "txHash": tx_hash or "",
        }
    )


def _tx_hex(log: object) -> str:
    if isinstance(log, dict):
        h = log.get("transactionHash")
    else:
        h = getattr(log, "transactionHash", None)
    if h is None:
        return ""
    return h.hex() if hasattr(h, "hex") else str(h)


def _args(log: object) -> dict:
    if isinstance(log, dict):
        return dict(log.get("args", {}))
    a = getattr(log, "args", None)
    return dict(a) if a is not None else {}


async def _handle_logs(session: AsyncSession | None, w3: Web3, contract, from_block: int, to_block: int) -> None:
    for event_name, handler in (
        ("LoanRequested", _on_requested),
        ("LoanFunded", _on_funded),
        ("LoanCompleted", _on_completed),
        ("LoanDefaulted", _on_defaulted),
    ):
        try:
            evt = getattr(contract.events, event_name)

            def _fetch(e=evt, fb=from_block, tb=to_block):
                return e.get_logs(from_block=fb, to_block=tb)

            logs = await asyncio.to_thread(_fetch)
        except Exception as exc:
            logger.debug("event fetch %s: %s", event_name, exc)
            continue
        for log in logs:
            try:
                await handler(session, w3, contract, log)
            except Exception as exc:
                logger.warning("handler %s: %s", event_name, exc)


async def _on_requested(session, w3, contract, log) -> None:
    args = _args(log)
    lid = int(args["loanId"])
    borrower = args["borrower"]
    principal = float(args["principal"]) / 1e6
    apr_bps = int(args["aprBPS"])
    term_days = int(args["termDays"])
    guarantor = args["guarantor"]
    interest_pct = apr_bps / 100.0
    agreement = await asyncio.to_thread(lambda: contract.functions.getLoanAgreement(lid).call())
    agreement = w3.to_checksum_address(agreement)
    await persistence.upsert_loan_from_event(
        session,
        lid,
        borrower_wallet=borrower,
        amount_usdc=principal,
        interest_rate=interest_pct,
        duration_days=term_days,
        status="PENDING",
        guarantor_wallet=guarantor,
        contract_address=agreement,
    )
    _append_feed("LoanRequested", lid, borrower, principal, _tx_hex(log))


async def _on_funded(session, w3, contract, log) -> None:
    args = _args(log)
    lid = int(args["loanId"])
    lender = args["lender"]
    principal = float(args["principal"]) / 1e6
    loan = await persistence.get_loan(session, lid)
    if loan:
        await persistence.upsert_loan_from_event(
            session,
            lid,
            borrower_wallet=loan.borrower_wallet,
            amount_usdc=principal,
            interest_rate=loan.interest_rate,
            duration_days=loan.duration_days,
            status="FUNDED_PENDING_ACTIVATION",
            lender_wallet=lender,
            contract_address=loan.contract_address,
        )
    else:
        agreement = await asyncio.to_thread(lambda: contract.functions.getLoanAgreement(lid).call())
        agreement = w3.to_checksum_address(agreement)
        la_abi = [
            {
                "inputs": [],
                "name": "borrower",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function",
            },
            {
                "inputs": [],
                "name": "principal",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function",
            },
            {
                "inputs": [],
                "name": "aprBPS",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function",
            },
            {
                "inputs": [],
                "name": "termDays",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function",
            },
        ]
        la = w3.eth.contract(address=agreement, abi=la_abi)

        def _read_borrower():
            return la.functions.borrower().call()

        def _read_terms():
            p = la.functions.principal().call()
            a = la.functions.aprBPS().call()
            t = la.functions.termDays().call()
            return p, a, t

        borrower_addr = await asyncio.to_thread(_read_borrower)
        pr, ab, td = await asyncio.to_thread(_read_terms)
        await persistence.upsert_loan_from_event(
            session,
            lid,
            borrower_wallet=borrower_addr,
            amount_usdc=float(pr) / 1e6,
            interest_rate=float(ab) / 100.0,
            duration_days=int(td),
            status="FUNDED_PENDING_ACTIVATION",
            lender_wallet=lender,
            contract_address=agreement,
        )
    _append_feed("LoanFunded", lid, lender, principal, _tx_hex(log))


async def _on_completed(session, _w3, _contract, log) -> None:
    args = _args(log)
    lid = int(args["loanId"])
    borrower = args["borrower"]
    loan = await persistence.get_loan(session, lid)
    if loan:
        await persistence.upsert_loan_from_event(
            session,
            lid,
            borrower_wallet=borrower,
            amount_usdc=loan.amount_usdc,
            interest_rate=loan.interest_rate,
            duration_days=loan.duration_days,
            status="COMPLETED",
            lender_wallet=loan.lender_wallet,
            contract_address=loan.contract_address,
        )
    _append_feed("LoanCompleted", lid, borrower, loan.amount_usdc if loan else None, _tx_hex(log))


async def _on_defaulted(session, _w3, _contract, log) -> None:
    args = _args(log)
    lid = int(args["loanId"])
    borrower = args["borrower"]
    loan = await persistence.get_loan(session, lid)
    if loan:
        await persistence.upsert_loan_from_event(
            session,
            lid,
            borrower_wallet=borrower,
            amount_usdc=loan.amount_usdc,
            interest_rate=loan.interest_rate,
            duration_days=loan.duration_days,
            status="DEFAULTED",
            lender_wallet=loan.lender_wallet,
            contract_address=loan.contract_address,
        )
    _append_feed("LoanDefaulted", lid, borrower, loan.amount_usdc if loan else None, _tx_hex(log))


async def sync_once() -> None:
    rpc = (
        os.getenv("WEB3_RPC_URL")
        or os.getenv("HARDHAT_RPC_URL")
        or os.getenv("ALCHEMY_MUMBAI_URL")
        or os.getenv("ALCHEMY_POLYGON_URL")
    )
    addr = os.getenv("LOAN_FACTORY_ADDRESS")
    if not rpc or not addr:
        return
    w3 = Web3(Web3.HTTPProvider(rpc))
    if not await asyncio.to_thread(w3.is_connected):
        return
    contract = w3.eth.contract(address=w3.to_checksum_address(addr), abi=_factory_abi())
    latest = await asyncio.to_thread(lambda: w3.eth.block_number)
    last = _read_last_block()
    if last == 0:
        from_b = max(0, latest - 1999)
    else:
        from_b = last + 1
    if from_b > latest:
        return
    to_b = latest
    if DB_AVAILABLE:
        async with SessionLocal() as session:
            await _handle_logs(session, w3, contract, from_b, to_b)
    else:
        await _handle_logs(None, w3, contract, from_b, to_b)
    _write_last_block(to_b)


async def listener_loop(stop: asyncio.Event) -> None:
    while not stop.is_set():
        try:
            await sync_once()
        except Exception as exc:
            logger.debug("chain sync: %s", exc)
        try:
            await asyncio.wait_for(stop.wait(), timeout=8.0)
        except TimeoutError:
            continue
