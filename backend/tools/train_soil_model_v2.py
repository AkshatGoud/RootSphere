import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import random

# --- Configuration ---
DATA_FILE = os.path.join(os.path.dirname(__file__), "../data/RS_Session_257_AU_2256_1.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../api/ml")

# Nutrient Ranges (kg/ha) and OC (%) based on Soil Health Card Scheme (India)
# We infer VL/VH where official docs usually merge them, to match the CSV's granularity.
RANGES = {
    "N": {
        "VL": (0, 140),     # Assumed half of Low
        "L": (140, 280),    # Official Low < 280
        "M": (280, 560),    # Official Medium
        "H": (560, 700),    # Official High > 560
        "VH": (700, 900)    # Assumed Very High
    },
    "P": {
        "VL": (0, 5),       # Assumed half of Low
        "L": (5, 10),       # Official Low < 10
        "M": (10, 25),      # Official Medium
        "H": (25, 50),      # Official High
        "VH": (50, 80)      # Official Very High > 50
    },
    "K": {
        "VL": (0, 60),      # Assumed half of Low
        "L": (60, 120),     # Official Low < 120
        "M": (120, 280),    # Official Medium
        "H": (280, 600),    # Official High
        "VH": (600, 800)    # Official Very High > 600
    },
    "OC": {
        "VL": (0.0, 0.25),  # Assumed half of Low
        "L": (0.25, 0.5),   # Official Low < 0.5
        "M": (0.5, 0.75),   # Official Medium
        "H": (0.75, 1.0),   # Official High > 0.75
        "VH": (1.0, 1.5)    # Assumed Very High
    }
}

def load_distribution_data():
    """Reads the CSV and calculates probability distributions per state."""
    print(f"Loading authentic data from {DATA_FILE}...")
    df = pd.read_csv(DATA_FILE)
    
    # Filter out "Total" row
    df = df[df["State/UT"] != "Total"]
    
    # Store probability dicts
    # Structure: { "StateName": { "N": {"VL": 0.1, "L": 0.4...}, "P": ... } }
    dist_map = {}
    
    for _, row in df.iterrows():
        state = row["State/UT"]
        dist_map[state] = {}
        
        # Process N, P, K, OC
        nutrient_cols = {
            "N": ["Nitrogen (N) - VL", "Nitrogen (N) - L", "Nitrogen (N) - M", "Nitrogen (N) - H", "Nitrogen (N) - VH"],
            "P": ["Phosphorous (P) - VL", "Phosphorous (P) - L", "Phosphorous (P) - M", "Phosphorous (P) - H", "Phosphorous (P) - VH"],
            "K": ["Potassium (K) - VL", "Potassium (K) - L", "Potassium (K) - M", "Potassium (K) - H", "Potassium (K) - VH"],
            "OC": ["Organic Carbon (OC) - VL", "Organic Carbon (OC) - L", "Organic Carbon (OC) - M", "Organic Carbon (OC) - H", "Organic Carbon (OC) - VH"]
        }
        
        categories = ["VL", "L", "M", "H", "VH"]
        
        for nut, cols in nutrient_cols.items():
            counts = [float(row[c]) if not pd.isna(row[c]) else 0.0 for c in cols]
            total = sum(counts)
            if total > 0:
                probs = [c / total for c in counts]
            else:
                # Fallback if state has no data for this nutrient (unlikely but possible)
                probs = [0.2, 0.2, 0.2, 0.2, 0.2]
            
            dist_map[state][nut] = dict(zip(categories, probs))
            
    return dist_map, list(dist_map.keys())

def generate_authentic_samples(n_samples=10000):
    """Generates synthetic data based on real probability distributions."""
    dist_map, states = load_distribution_data()
    print(f"Generating {n_samples} samples based on Govt of India data...")
    
    data = []
    crops = ["Rice", "Wheat", "Maize"]
    
    for _ in range(n_samples):
        # 1. Pick a location (Uniformly or we could weight by state size, but uniform covers all terrain types better for ML robustness)
        state = random.choice(states)
        probs = dist_map[state]
        
        # 2. Sample Nutrient Categories based on Real Stats
        # numpy.choice is faster but we need keys/values
        
        cats = ["VL", "L", "M", "H", "VH"]
        
        # Sample N
        n_cat = random.choices(cats, weights=list(probs["N"].values()))[0]
        n_val = random.uniform(*RANGES["N"][n_cat])
        
        # Sample P
        p_cat = random.choices(cats, weights=list(probs["P"].values()))[0]
        p_val = random.uniform(*RANGES["P"][p_cat])
        
        # Sample K
        k_cat = random.choices(cats, weights=list(probs["K"].values()))[0]
        k_val = random.uniform(*RANGES["K"][k_cat])
        
        # Sample OC (Affects pH conceptually but we simulate pH separately)
        # Using pH range 4.5 to 8.5 typical
        ph_val = random.uniform(5.0, 8.5) 
        
        # Moisture (Weather dependent, not soil inherent usually, but part of model input)
        moisture_val = random.uniform(10, 90)
        
        crop = random.choice(crops)
        
        # 3. Assign Label (The "Expert" Decision)
        # We use the generated VALUES to determine the label, ensuring consistency.
        status = "Healthy"
        
        # Rule Hierarchy (matches the CSV categories intuitively)
        # Low N/P/K/OC -> Deficient
        
        if n_cat in ["VL", "L"]:
            status = "Low Nitrogen"
        elif p_cat in ["VL", "L"]:
            status = "Low Phosphorus"
        elif k_cat in ["VL", "L"]:
            status = "Low Potassium"
        elif ph_val < 5.5:
            status = "Acidic Soil"
        elif ph_val > 8.0:
            status = "Alkaline Soil"
        elif moisture_val < 30:
            status = "Low Moisture"
            
        data.append({
            "N": n_val,
            "P": p_val,
            "K": k_val,
            "pH": ph_val,
            "Moisture": moisture_val,
            "Crop": crop,
            "Status": status
        })
        
    return pd.DataFrame(data)

def train_model():
    df = generate_authentic_samples(10000)
    
    # Data summary
    print("\nGenerated Data Distribution:")
    print(df["Status"].value_counts())
    
    # Preprocessing
    df = pd.get_dummies(df, columns=["Crop"], drop_first=False)
    
    # Ensure columns
    for c in ["Crop_Rice", "Crop_Wheat", "Crop_Maize"]:
        if c not in df.columns:
            df[c] = 0
            
    X = df.drop(columns=["Status"])
    y = df["Status"]
    
    print("\nTraining Random Forest Classifier on Authentic Distributions...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluation
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\nModel Accuracy: {acc:.4f}")
    
    # Save
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "soil_classifier.joblib")
    joblib.dump(clf, model_path)
    print(f"\n✅ Authentic Model saved to: {model_path}")

if __name__ == "__main__":
    train_model()
