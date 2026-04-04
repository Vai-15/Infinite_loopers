from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

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
TARGET_COLUMN = "is_high_risk"

# Simulated credit score formula (range 300-850):
# score = 300 + 550 * (
#   0.35*repayment_rate +
#   0.15*(1-default_count/5) +
#   0.15*log1p(wallet_age_days)/log1p(2000) +
#   0.10*log1p(num_transactions)/log1p(500) +
#   0.10*clip(community_vouches/10, 0, 1) +
#   0.10*clip(monthly_income_usd/10000, 0, 1) +
#   0.05*clip(days_employed/3650, 0, 1)
# )

def simulated_credit_score(row: pd.Series) -> int:
    blended = (
        0.35 * row["repayment_rate"]
        + 0.15 * (1 - (row["default_count"] / 5.0))
        + 0.15 * (np.log1p(row["wallet_age_days"]) / np.log1p(2000))
        + 0.10 * (np.log1p(row["num_transactions"]) / np.log1p(500))
        + 0.10 * np.clip(row["community_vouches"] / 10.0, 0, 1)
        + 0.10 * np.clip(row["monthly_income_usd"] / 10_000.0, 0, 1)
        + 0.05 * np.clip(row["days_employed"] / 3650.0, 0, 1)
    )
    return int(np.clip(round(300 + 550 * blended), 300, 850))


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    dataset_path = base_dir / "data" / "training.csv"
    model_path = base_dir / "models" / "credit_model.pkl"

    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Training dataset missing at {dataset_path}. Run ml/generate_data.py first."
        )

    df = pd.read_csv(dataset_path)
    x = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = XGBClassifier(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    y_prob = model.predict_proba(x_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    df["simulated_credit_score"] = df.apply(simulated_credit_score, axis=1)

    artifact = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "metrics": {"accuracy": float(accuracy), "auc": float(auc)},
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, model_path)

    print(f"Model saved to: {model_path}")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"AUC: {auc:.4f}")
    print(
        "Simulated credit score stats:",
        {
            "min": int(df["simulated_credit_score"].min()),
            "max": int(df["simulated_credit_score"].max()),
            "mean": round(float(df["simulated_credit_score"].mean()), 2),
        },
    )


if __name__ == "__main__":
    main()
