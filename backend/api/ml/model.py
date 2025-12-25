import joblib
import pandas as pd
import os
import logging
from typing import Dict, Any

logger = logging.getLogger("api")

class SoilHealthClassifier:
    def __init__(self):
        self.model = None
        self.blobs = ["Crop_Rice", "Crop_Wheat", "Crop_Maize"]
        self.load_model()
        
    def load_model(self):
        try:
            # Assume model is in same directory
            model_path = os.path.join(os.path.dirname(__file__), "soil_classifier.joblib")
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                logger.info(f"Loaded ML Model from {model_path}")
            else:
                logger.warning(f"ML Model not found at {model_path}")
        except Exception as e:
            logger.error(f"Failed to load ML Model: {e}")

    def predict(self, n: float, p: float, k: float, ph: float, moisture: float, crop: str) -> str:
        if not self.model:
            return "Model Not Available"
            
        try:
            # Prepare Input DataFrame
            input_data = {
                "N": [n],
                "P": [p],
                "K": [k],
                "pH": [ph],
                "Moisture": [moisture]
            }
            
            # Add one-hot encoded crop columns
            target_col = f"Crop_{crop}"
            for c in self.blobs:
                input_data[c] = [1 if c == target_col else 0]
                
            df = pd.DataFrame(input_data)
            
            # Enforce column order matching training (N, P, K, pH, Moisture, Crop_Maize, Crop_Rice, Crop_Wheat)
            # The order in training was: N, P, K, pH, Moisture, Crop_Maize, Crop_Rice, Crop_Wheat (alphabetical? No, get_dummies result)
            # train_soil_model.py: df.drop(columns=["Status"])
            # Let's verify exact columns. `pd.get_dummies` creates sorted columns by default.
            # So Crop_Maize, Crop_Rice, Crop_Wheat.
            expected_cols = ["N", "P", "K", "pH", "Moisture", "Crop_Maize", "Crop_Rice", "Crop_Wheat"]
            df = df[expected_cols]
            
            # Predict
            prediction = self.model.predict(df)[0]
            return str(prediction)
            
        except Exception as e:
            logger.error(f"Prediction Error: {e}")
            return "Analysis Failed"

# Singleton instance
classifier = SoilHealthClassifier()
