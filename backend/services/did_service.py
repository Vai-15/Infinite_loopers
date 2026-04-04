from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime


def generate_did(wallet_address: str) -> str:
    return f"did:polygon:{wallet_address.lower()}"


def build_did_document(wallet_address: str) -> dict[str, object]:
    did = generate_did(wallet_address)
    return {
        "@context": ["https://www.w3.org/ns/did/v1"],
        "id": did,
        "verificationMethod": [
            {
                "id": f"{did}#owner",
                "type": "EcdsaSecp256k1RecoveryMethod2020",
                "controller": did,
                "blockchainAccountId": wallet_address.lower(),
            }
        ],
        "authentication": [f"{did}#owner"],
        "created": datetime.now(UTC).isoformat(),
    }


def upload_to_ipfs(payload: dict[str, object]) -> str:
    serialized = json.dumps(payload, sort_keys=True).encode("utf-8")
    digest = hashlib.sha256(serialized).hexdigest()
    return f"bafy{digest[:32]}"
