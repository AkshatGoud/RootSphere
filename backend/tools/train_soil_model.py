import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import random

# --- 1. Synthetic Data Generation ---
def generate_synthetic_data(n_samples=5000):
    print(f"Generating {n_samples} synthetic soil samples...")
    
    data = []
    crops = ["Rice", "Wheat", "Maize"]
    
    for _ in range(n_samples):
        crop = random.choice(crops)
        
        # Generate random features (realistic ranges)
        n = random.uniform(0, 100)  # Nitrogen mg/kg
        p = random.uniform(0, 100)  # Phosphorus mg/kg
        k = random.uniform(0, 100)  # Potassium mg/kg
        ph = random.uniform(4.0, 9.0) # pH level
        moisture = random.uniform(10, 90) # Moisture %
        
        # Determine Label based on Rules (Simulating an Agronomist)
        # These rules basically "teach" the model what we know.
        
        status = "Healthy"
        
        # pH Priority
        if ph < 5.5:
            status = "Acidic Soil"
        elif ph > 8.0:
            status = "Alkaline Soil"
        else:
            # Nutrient checks (vary by crop slightly in reality, but simplified here)
            # Rice needs high N
            if crop == "Rice":
                if n < 40: status = "Low Nitrogen"
                elif n > 80: status = "High Nitrogen"
                elif p < 20: status = "Low Phosphorus"
                elif k < 20: status = "Low Potassium"
                elif moisture < 30: status = "Low Moisture"
            
            # Wheat
            elif crop == "Wheat":
                if n < 30: status = "Low Nitrogen"
                elif p < 20: status = "Low Phosphorus"
                elif k < 20: status = "Low Potassium"
            
            # Maize
            elif crop == "Maize":
                if n < 50: status = "Low Nitrogen"
                elif p < 30: status = "Low Phosphorus"
                elif k < 30: status = "Low Potassium"

        # Add noise? (Maybe later. For now, we want it to learn the rules perfectly)
        
        data.append({
            "N": n,
            "P": p,
            "K": k,
            "pH": ph,
            "Moisture": moisture,
            "Crop": crop,
            "Status": status
        })
        
    return pd.DataFrame(data)

# --- 2. Model Training ---
def train_model():
    df = generate_synthetic_data(10000)
    
    # Preprocessing
    # One-hot encode Crop
    df = pd.get_dummies(df, columns=["Crop"], drop_first=False)
    
    # Ensure all crop columns exist even if random missed one (unlikely with 10k samples)
    for c in ["Crop_Rice", "Crop_Wheat", "Crop_Maize"]:
        if c not in df.columns:
            df[c] = 0
            
    X = df.drop(columns=["Status"])
    y = df["Status"]
    
    print("\nTraining Random Forest Classifier...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluation
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\nModel Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, preds))
    
    # --- 3. Save Artifacts ---
    output_dir = os.path.join(os.path.dirname(__file__), "../api/ml")
    os.makedirs(output_dir, exist_ok=True)
    
    model_path = os.path.join(output_dir, "soil_classifier.joblib")
    joblib.dump(clf, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Basic Feature Importance
    print("\nFeature Importances:")
    importances = list(zip(X.columns, clf.feature_importances_))
    importances.sort(key=lambda x: x[1], reverse=True)
    for feat, imp in importances:
        print(f"{feat}: {imp:.4f}")

if __name__ == "__main__":
    train_model()
