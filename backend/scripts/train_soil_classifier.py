#!/usr/bin/env python3
"""
Train Soil Health Classifier on Real Data

Uses the Crop Recommendation Dataset (2200 real Indian soil samples across 22 crops)
with ICAR/TNAU thresholds to derive soil health labels. This combines real-world
nutrient distributions with scientific standards.

Usage:
    python backend/scripts/train_soil_classifier.py
"""

import sys
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib


# ICAR/TNAU thresholds for soil health classification
# These are crop-agnostic nutrient adequacy levels based on Indian Soil Health Card standards
# N, P, K in kg/ha; pH dimensionless
NUTRIENT_THRESHOLDS = {
    "N_low": 40,      # Below this: low nitrogen (dataset uses kg/ha scale)
    "P_low": 20,      # Below this: low phosphorus
    "K_low": 30,      # Below this: low potassium
    "ph_low": 5.5,    # Below this: acidic soil issue
    "ph_high": 8.0,   # Above this: alkaline soil issue
}

# Map dataset crop names to RootSphere crop column names
# The dataset has 22 crops; we map overlapping ones to RootSphere's supported set
CROP_COLUMN_MAP = {
    "rice": "Crop_Rice",
    "maize": "Crop_Maize",
    "cotton": "Crop_Cotton",
    "jute": "Crop_Jute",
    "coffee": "Crop_Coffee",
    "banana": "Crop_Banana",
    "mango": "Crop_Mango",
    "coconut": "Crop_Coconut",
    "papaya": "Crop_Papaya",
    "orange": "Crop_Orange",
    "apple": "Crop_Apple",
    "grapes": "Crop_Grapes",
    "watermelon": "Crop_Watermelon",
    "muskmelon": "Crop_Muskmelon",
    "chickpea": "Crop_Chickpea",
    "kidneybeans": "Crop_Kidneybeans",
    "pigeonpeas": "Crop_Pigeonpeas",
    "mothbeans": "Crop_Mothbeans",
    "mungbean": "Crop_Mungbean",
    "blackgram": "Crop_Blackgram",
    "lentil": "Crop_Lentil",
    "pomegranate": "Crop_Pomegranate",
    # Legacy RootSphere crops mapped from dataset equivalents
    "wheat": "Crop_Wheat",
    "groundnut": "Crop_Groundnut",
    "sorghum": "Crop_Sorghum",
}

# All crop columns used in training (sorted for deterministic ordering)
ALL_CROP_COLUMNS = sorted(set(CROP_COLUMN_MAP.values()) | {
    "Crop_Wheat", "Crop_Groundnut", "Crop_Sorghum",
    "Crop_Cotton", "Crop_Rice", "Crop_Maize",
})


def classify_soil_health(row) -> str:
    """
    Derive soil health label from nutrient values using ICAR thresholds.

    Returns one of:
    - "Healthy"
    - "Low Nitrogen"
    - "Low Phosphorus"
    - "Low Potassium"
    - "pH Issue"
    - Combined labels for multiple deficiencies
    - "Multiple Deficiencies" for 3+ issues
    """
    t = NUTRIENT_THRESHOLDS
    issues = []

    if row["N"] < t["N_low"]:
        issues.append("Low Nitrogen")
    if row["P"] < t["P_low"]:
        issues.append("Low Phosphorus")
    if row["K"] < t["K_low"]:
        issues.append("Low Potassium")
    if row["ph"] < t["ph_low"] or row["ph"] > t["ph_high"]:
        issues.append("pH Issue")

    if len(issues) == 0:
        return "Healthy"
    elif len(issues) == 1:
        return issues[0]
    elif len(issues) == 2:
        return " + ".join(sorted(issues))
    else:
        return "Multiple Deficiencies"


def load_dataset() -> pd.DataFrame:
    """Load the Crop Recommendation Dataset from bundled CSV."""
    data_path = os.path.join(os.path.dirname(__file__), "data", "crop_recommendation.csv")
    if not os.path.exists(data_path):
        print(f"ERROR: Dataset not found at {data_path}")
        print("Please ensure crop_recommendation.csv is in backend/scripts/data/")
        sys.exit(1)

    df = pd.read_csv(data_path)
    print(f"  Loaded {len(df)} samples from {data_path}")
    print(f"  Columns: {list(df.columns)}")
    print(f"  Crops: {sorted(df['label'].unique())}")
    return df


def prepare_features(df: pd.DataFrame):
    """
    Prepare features and labels from the raw dataset.

    Features: N, P, K, pH, Moisture (humidity as proxy) + one-hot crop
    Labels: Derived from ICAR thresholds applied to real nutrient values
    """
    # Derive soil health labels from real nutrient values
    df["Status"] = df.apply(classify_soil_health, axis=1)

    # Map humidity to Moisture (reasonable proxy for field soil moisture)
    df["Moisture"] = df["humidity"]

    # Rename pH column
    df["pH"] = df["ph"]

    # Create one-hot crop columns
    crop_col_values = df["label"].map(CROP_COLUMN_MAP)
    for col in ALL_CROP_COLUMNS:
        df[col] = (crop_col_values == col).astype(int)

    # Select features
    feature_cols = ["N", "P", "K", "pH", "Moisture"] + sorted(ALL_CROP_COLUMNS)
    X = df[feature_cols].copy()
    y = df["Status"].copy()

    return X, y, feature_cols


def main():
    print("=" * 60)
    print("Soil Health Classifier - Real Data Training Pipeline")
    print("=" * 60)

    # 1. Load real dataset
    print("\n[1/5] Loading Crop Recommendation Dataset...")
    df = load_dataset()

    # 2. Prepare features
    print("\n[2/5] Preparing features with ICAR threshold labels...")
    X, y, feature_cols = prepare_features(df)
    print(f"  Features ({len(feature_cols)}): {feature_cols}")
    print(f"\n  Label distribution (derived from real nutrient values):")
    for label, count in y.value_counts().sort_index().items():
        print(f"    {label}: {count} ({count/len(y)*100:.1f}%)")

    # 3. Train/test split
    print("\n[3/5] Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train)} | Test: {len(X_test)}")

    # 4. Train model with cross-validation
    print("\n[4/5] Training GradientBoosting classifier...")
    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
    )

    # Cross-validation on training set
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="accuracy")
    print(f"  5-fold CV accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

    # Full training
    model.fit(X_train, y_train)

    # 5. Evaluate
    print("\n[5/5] Evaluation results:")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n  Test Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")

    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    print("  Confusion Matrix:")
    labels = sorted(y.unique())
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    max_label_len = max(len(l) for l in labels)
    header = " " * (max_label_len + 2) + "  ".join(f"{l[:8]:>8}" for l in labels)
    print(f"  {header}")
    for i, label in enumerate(labels):
        row = "  ".join(f"{v:>8}" for v in cm[i])
        print(f"  {label:<{max_label_len}}  {row}")

    # Feature importances
    print("\n  Top 10 Feature Importances:")
    importances = sorted(
        zip(feature_cols, model.feature_importances_),
        key=lambda x: x[1], reverse=True
    )
    for feat, imp in importances[:10]:
        print(f"    {feat}: {imp:.4f}")

    # 6. Save model
    output_path = os.path.join(os.path.dirname(__file__), "../api/ml/soil_classifier.joblib")
    output_path = os.path.normpath(output_path)
    joblib.dump(model, output_path)
    print(f"\n  Model saved to: {output_path}")
    print(f"  Model file size: {os.path.getsize(output_path) / 1024:.1f} KB")

    # Print crop columns for model.py reference
    print(f"\n  Crop columns for model.py blobs:")
    print(f"    {sorted(ALL_CROP_COLUMNS)}")
    print("\nDone!")


if __name__ == "__main__":
    main()
