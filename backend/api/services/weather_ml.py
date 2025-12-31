import requests
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sklearn.preprocessing import MinMaxScaler
from api.ml.lstm import LSTMWeatherModel
import joblib

logger = logging.getLogger("api")

OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
MODELS_DIR = os.path.join(os.path.dirname(__file__), "../ml/models")
os.makedirs(MODELS_DIR, exist_ok=True)

class WeatherMLService:
    def __init__(self):
        self.scaler = MinMaxScaler()
        self.input_size = 4 # Temp Max, Temp Min, Rain, Humidity
        self.seq_length = 7
        self.output_size = 3 # Next 3 days rain

    def _fetch_historical_data(self, lat: float, lon: float, years=2) -> pd.DataFrame:
        """Fetch historical weather data from Open-Meteo."""
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=years*365)).strftime("%Y-%m-%d")
        
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean",
            "timezone": "auto"
        }
        
        try:
            res = requests.get(OPEN_METEO_ARCHIVE_URL, params=params)
            res.raise_for_status()
            data = res.json()
            
            df = pd.DataFrame(data['daily'])
            # Rename columns to standard internal names
            df = df.rename(columns={
                "temperature_2m_max": "temp_max",
                "temperature_2m_min": "temp_min",
                "precipitation_sum": "rain",
                "relative_humidity_2m_mean": "humidity"
            })
            return df[["temp_max", "temp_min", "rain", "humidity"]].fillna(0)
            
        except Exception as e:
            logger.error(f"Failed to fetch historical weather: {e}")
            raise

    def _prepare_sequences(self, data: np.ndarray):
        """Create sequences for LSTM."""
        X, y = [], []
        # We want to predict Rain (index 2)
        for i in range(len(data) - self.seq_length - self.output_size):
            # Input: Sequence of all features
            X.append(data[i:(i + self.seq_length)])
            # Output: Sequence of Rain only (next 3 days)
            y.append(data[(i + self.seq_length):(i + self.seq_length + self.output_size), 2]) 
            
        return np.array(X), np.array(y)

    def train_model_for_field(self, field_id: str, lat: float, lon: float):
        """Train and save a model specifically for this field."""
        logger.info(f"Training Weather Model for Field {field_id}...")
        
        # 1. Fetch Data
        df = self._fetch_historical_data(lat, lon)
        if df.empty:
            logger.warning("No weather data found.")
            return
            
        # 2. Preprocess
        # Fit scaler on this field's data
        scaled_data = self.scaler.fit_transform(df)
        
        # Save Scaler for inference
        scaler_path = os.path.join(MODELS_DIR, f"scaler_{field_id}.joblib")
        joblib.dump(self.scaler, scaler_path)
        
        X, y = self._prepare_sequences(scaled_data)
        
        X_tensor = torch.FloatTensor(X)
        y_tensor = torch.FloatTensor(y)
        
        # 3. Model Setup
        # SOTA: Stacked Bi-LSTM (3 layers, 64 units)
        model = LSTMWeatherModel(input_size=self.input_size, hidden_size=64, num_layers=3, dropout=0.2)
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        
        # 4. Train Loop
        epochs = 100  # Increased for deeper model
        for epoch in range(epochs):
            model.train()
            optimizer.zero_grad()
            outputs = model(X_tensor)
            loss = criterion(outputs, y_tensor)
            loss.backward()
            optimizer.step()
            
            if (epoch+1) % 10 == 0:
                logger.info(f"Field {field_id} | Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.4f}")
                
        # 5. Save Model
        model_path = os.path.join(MODELS_DIR, f"model_{field_id}.pth")
        torch.save(model.state_dict(), model_path)
        logger.info(f"✅ Trained and Saved Model: {model_path}")

    def predict_next_3_days(self, field_id: str, recent_data: List[Dict]) -> List[float]:
        """
        Predict rain for next 3 days.
        recent_data: List of last 7 days dicts [{'temp_max':.., 'rain':..}, ...]
        """
        model_path = os.path.join(MODELS_DIR, f"model_{field_id}.pth")
        scaler_path = os.path.join(MODELS_DIR, f"scaler_{field_id}.joblib")
        
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            logger.warning(f"No model found for field {field_id}")
            return [0.0, 0.0, 0.0]
            
        try:
            # Load artifacts
            # Instantiate with SAME architecture
            model = LSTMWeatherModel(input_size=self.input_size, hidden_size=64, num_layers=3)
            model.load_state_dict(torch.load(model_path))
            model.eval()
            
            scaler = joblib.load(scaler_path)
            
            # Prepare Input
            df = pd.DataFrame(recent_data)
            # Ensure columns order
            df = df[["temp_max", "temp_min", "rain", "humidity"]]
            
            # Scale
            scaled = scaler.transform(df) # Shape (7, 4)
            input_tensor = torch.FloatTensor(scaled).unsqueeze(0) # (1, 7, 4)
            
            # Predict
            with torch.no_grad():
                prediction_scaled = model(input_tensor) # (1, 3)
                
            prediction_scaled = prediction_scaled.numpy()[0]
            
            # Inverse Transform?
            # Start tricky part: We predicted 3 future Rain values (one feature).
            # The scaler works on 4 features.
            # We need to construct a dummy matrix to inverse transform.
            
            dummy = np.zeros((3, 4))
            dummy[:, 2] = prediction_scaled # Fill Rain column
            
            # Inverse transform and extract Rain column
            prediction_actual = scaler.inverse_transform(dummy)[:, 2]
            
            # Clip negative values (though ReLU helps)
            prediction_actual = [max(0.0, float(x)) for x in prediction_actual]
            
            return prediction_actual

        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return [0.0, 0.0, 0.0]

weather_ml_service = WeatherMLService()
