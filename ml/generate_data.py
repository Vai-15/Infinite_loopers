from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

ROWS = 10_000
RANDOM_SEED = 42


def generate_dataset(rows: int = ROWS) -> pd.DataFrame:
    rng = np.random.default_rng(RANDOM_SEED)

    wallet_age_days = rng.integers(30, 2001, size=rows)
    num_transactions = rng.integers(1, 501, size=rows)
    avg_tx_value_usd = np.clip(rng.exponential(scale=650, size=rows) + 1, 1, 5000)
    num_previous_loans = rng.integers(0, 21, size=rows)
    repayment_rate = np.clip(rng.beta(5, 2, size=rows), 0, 1)
    default_count = np.clip(rng.poisson(0.3, size=rows), 0, 5)
    community_vouches = rng.integers(0, 11, size=rows)
    monthly_income_usd = np.clip(rng.lognormal(mean=np.log(2000), sigma=0.7, size=rows), 100, 10_000)
    days_employed = rng.integers(0, 3651, size=rows)

    is_high_risk = ((repayment_rate < 0.6) | (default_count > 1)).astype(int)

    return pd.DataFrame(
        {
            "wallet_age_days": wallet_age_days,
            "num_transactions": num_transactions,
            "avg_tx_value_usd": avg_tx_value_usd,
            "num_previous_loans": num_previous_loans,
            "repayment_rate": repayment_rate,
            "default_count": default_count,
            "community_vouches": community_vouches,
            "monthly_income_usd": monthly_income_usd,
            "days_employed": days_employed,
            "is_high_risk": is_high_risk,
        }
    )


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    output_path = base_dir / "data" / "training.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    dataset = generate_dataset()
    dataset.to_csv(output_path, index=False)

    print(f"Saved synthetic training data to: {output_path}")
    print(dataset.head().to_string(index=False))
    print("High-risk ratio:", round(float(dataset["is_high_risk"].mean()), 4))


if __name__ == "__main__":
    main()
