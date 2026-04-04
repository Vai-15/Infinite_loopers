from __future__ import annotations

from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

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

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODEL_DIR = Path(__file__).resolve().parent
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def _simulated_score(row: pd.Series) -> float:
    blended = (
        0.35 * float(row["repayment_rate"])
        + 0.15 * (1 - min(float(row["default_count"]) / 5.0, 1.0))
        + 0.15 * (np.log1p(row["wallet_age_days"]) / np.log1p(2000))
        + 0.10 * (np.log1p(row["num_transactions"]) / np.log1p(500))
        + 0.10 * min(float(row["community_vouches"]) / 10.0, 1.0)
        + 0.10 * min(float(row["monthly_income_usd"]) / 10000.0, 1.0)
        + 0.05 * min(float(row["days_employed"]) / 3650.0, 1.0)
    )
    noise = np.random.normal(0, 0.04)
    blended = float(np.clip(blended + noise, 0.0, 1.0))
    return float(300 + 550 * blended)


def main() -> None:
    rng = np.random.default_rng(42)
    n = 5000
    df = pd.DataFrame(
        {
            "wallet_age_days": rng.integers(30, 2500, n),
            "num_transactions": rng.integers(0, 800, n),
            "avg_tx_value_usd": rng.uniform(5, 5000, n),
            "num_previous_loans": rng.integers(0, 12, n),
            "repayment_rate": rng.uniform(0.2, 1.0, n),
            "default_count": rng.integers(0, 6, n),
            "community_vouches": rng.integers(0, 15, n),
            "monthly_income_usd": rng.uniform(800, 20000, n),
            "days_employed": rng.integers(30, 8000, n),
        }
    )
    df["credit_score"] = df.apply(_simulated_score, axis=1)
    df["credit_score"] = df["credit_score"].clip(300, 850)

    csv_path = DATA_DIR / "training_synthetic.csv"
    df.to_csv(csv_path, index=False)
    print("Wrote", csv_path)

    X = df[FEATURE_COLUMNS]
    y = df["credit_score"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

    model = XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
    )
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    r2 = r2_score(y_test, pred)
    print("R2 on holdout:", round(r2, 4))
    if r2 < 0.85:
        print("Warning: R2 below 0.85 target; synthetic signal may be too noisy.")

    artifact = {"model": model, "feature_columns": FEATURE_COLUMNS}
    out_pkl = MODEL_DIR / "credit_model.pkl"
    joblib.dump(artifact, out_pkl)
    print("Saved", out_pkl)

    imp = model.feature_importances_
    order = np.argsort(imp)[::-1]
    plt.figure(figsize=(8, 4))
    plt.barh([FEATURE_COLUMNS[i] for i in order[::-1]], imp[order[::-1]], color="#38bdf8")
    plt.title("Feature importance")
    plt.tight_layout()
    fig_path = MODEL_DIR / "feature_importance.png"
    plt.savefig(fig_path, dpi=120)
    plt.close()
    print("Wrote", fig_path)


if __name__ == "__main__":
    main()
