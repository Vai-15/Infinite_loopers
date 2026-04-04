from __future__ import annotations

import os
from typing import Any

from web3 import Web3
from web3.contract import Contract

LOAN_FACTORY_MIN_ABI: list[dict[str, Any]] = [
    {
        "inputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
        "name": "getLoanAgreement",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "loanIdCounter",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


class BlockchainService:
    def __init__(self, rpc_url: str | None = None, loan_factory_address: str | None = None) -> None:
        self.rpc_url = (
            rpc_url
            or os.getenv("WEB3_RPC_URL")
            or os.getenv("HARDHAT_RPC_URL")
            or os.getenv("ALCHEMY_MUMBAI_URL")
            or os.getenv("ALCHEMY_POLYGON_URL")
        )
        self.loan_factory_address = loan_factory_address or os.getenv("LOAN_FACTORY_ADDRESS")
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url)) if self.rpc_url else None

    def is_connected(self) -> bool:
        return bool(self.w3 and self.w3.is_connected())

    def get_wallet_tx_count(self, wallet_address: str) -> int:
        if not self.w3:
            return 0
        try:
            checksum = self.w3.to_checksum_address(wallet_address)
            return int(self.w3.eth.get_transaction_count(checksum))
        except Exception:
            return 0

    def get_loan_factory_contract(self) -> Contract | None:
        if not self.w3 or not self.loan_factory_address:
            return None
        try:
            checksum = self.w3.to_checksum_address(self.loan_factory_address)
            return self.w3.eth.contract(address=checksum, abi=LOAN_FACTORY_MIN_ABI)
        except Exception:
            return None

    def get_total_loans(self) -> int:
        contract = self.get_loan_factory_contract()
        if contract is None:
            return 0
        try:
            return int(contract.functions.loanIdCounter().call())
        except Exception:
            return 0

    def get_loan_agreement(self, loan_id: int) -> str | None:
        contract = self.get_loan_factory_contract()
        if contract is None:
            return None
        try:
            return str(contract.functions.getLoanAgreement(int(loan_id)).call())
        except Exception:
            return None
