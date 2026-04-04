from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "wallet_age_days",
    "num_transactions",
    "avg_tx_value_usd",
    "num_previous_loans",
    "repayment_rate",
    "default_count",
    "community_vouches",
    "monthly_income_usd",
    "days_employed",
]


class CreditService:
    def __init__(self) -> None:
        self.model_artifact = self._load_model_artifact()

    def _candidate_paths(self) -> list[Path]:
        current = Path(__file__).resolve()
        return [
            current.parents[2] / "ml" / "models" / "credit_model.pkl",
            current.parents[1] / "ml" / "models" / "credit_model.pkl",
            Path("/app/ml/models/credit_model.pkl"),
        ]

    def _load_model_artifact(self):
        for path in self._candidate_paths():
            if path.exists():
                return joblib.load(path)
        return None

    def _feature_frame(self, features: dict[str, float], columns: list[str]) -> pd.DataFrame:
        row = {name: float(features.get(name, 0.0)) for name in columns}
        return pd.DataFrame([row], columns=columns)

    def _heuristic_score(self, features: dict[str, float]) -> tuple[int, float]:
        repayment_rate = float(features.get("repayment_rate", 0.6))
        default_count = float(features.get("default_count", 0.0))
        wallet_age_days = float(features.get("wallet_age_days", 365.0))
        community_vouches = float(features.get("community_vouches", 0.0))

        risk = (
            0.55 * (1.0 - np.clip(repayment_rate, 0.0, 1.0))
            + 0.25 * np.clip(default_count / 5.0, 0.0, 1.0)
            + 0.10 * (1.0 - np.clip(np.log1p(wallet_age_days) / np.log1p(2000), 0.0, 1.0))
            + 0.10 * (1.0 - np.clip(community_vouches / 10.0, 0.0, 1.0))
        )
        risk = float(np.clip(risk, 0.0, 1.0))
        score = int(np.clip(round(850 - 550 * risk), 300, 850))
        confidence = float(np.clip(0.55 + abs(risk - 0.5), 0.55, 0.99))
        return score, confidence

    def _top_factors(self, features: dict[str, float]) -> list[str]:
        weights = {
            "repayment_rate": 0.35,
            "default_count": 0.25,
            "wallet_age_days": 0.12,
            "num_transactions": 0.08,
            "community_vouches": 0.08,
            "monthly_income_usd": 0.07,
            "avg_tx_value_usd": 0.03,
            "days_employed": 0.01,
            "num_previous_loans": 0.01,
        }
        ranked = sorted(weights.items(), key=lambda item: abs(float(features.get(item[0], 0.0))) * item[1], reverse=True)
        return [name for name, _ in ranked[:4]]

    def predict(self, features: dict[str, float]) -> dict[str, object]:
        if self.model_artifact is None:
            score, confidence = self._heuristic_score(features)
            risk_prob = 1 - ((score - 300) / 550)
        else:
            artifact = self.model_artifact
            model = artifact.get("model") if isinstance(artifact, dict) else artifact
            columns = artifact.get("feature_columns", FEATURE_COLUMNS) if isinstance(artifact, dict) else FEATURE_COLUMNS
            feature_frame = self._feature_frame(features, columns)
            raw = float(model.predict(feature_frame)[0])
            if raw >= 250:
                score = int(np.clip(round(raw), 300, 850))
                risk_prob = float(np.clip(1 - ((score - 300) / 550), 0.0, 1.0))
                confidence = float(np.clip(0.55 + abs(risk_prob - 0.5), 0.55, 0.99))
            elif hasattr(model, "predict_proba"):
                risk_prob = float(model.predict_proba(feature_frame)[0][1])
                score = int(np.clip(round(850 - (550 * risk_prob)), 300, 850))
                confidence = float(np.clip(max(risk_prob, 1 - risk_prob), 0.5, 0.99))
            else:
                risk_prob = float(np.clip(raw, 0.0, 1.0))
                score = int(np.clip(round(850 - (550 * risk_prob)), 300, 850))
                confidence = float(np.clip(max(risk_prob, 1 - risk_prob), 0.5, 0.99))

        if score >= 720:
            risk_level = "LOW"
        elif score >= 580:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        return {
            "score": score,
            "risk_level": risk_level,
            "confidence": round(confidence, 3),
            "top_factors": self._top_factors(features),
        }
