from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import confusion_matrix


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    model_path = base_dir / "models" / "credit_model.pkl"
    dataset_path = base_dir / "data" / "training.csv"

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found at {model_path}. Run ml/train.py first."
        )
    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {dataset_path}. Run ml/generate_data.py first."
        )

    artifact = joblib.load(model_path)
    model = artifact["model"] if isinstance(artifact, dict) else artifact
    feature_columns = artifact.get("feature_columns") if isinstance(artifact, dict) else None

    df = pd.read_csv(dataset_path)
    if not feature_columns:
        feature_columns = [c for c in df.columns if c != "is_high_risk"]

    x = df[feature_columns]
    y = df["is_high_risk"]

    predictions = model.predict(x)
    matrix = confusion_matrix(y, predictions)

    print("Confusion Matrix:")
    print(matrix)

    if hasattr(model, "feature_importances_"):
        importances = list(zip(feature_columns, model.feature_importances_, strict=False))
        ranked = sorted(importances, key=lambda item: item[1], reverse=True)
        print("\nFeature Importances:")
        for name, value in ranked:
            print(f"- {name}: {value:.4f}")


if __name__ == "__main__":
    main()
