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
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MODELS_DIR = os.path.join(os.path.dirname(__file__), "../ml/models")
os.makedirs(MODELS_DIR, exist_ok=True)

class WeatherMLService:
    def __init__(self):
        self.scaler = MinMaxScaler()
        self.rain_scaler = MinMaxScaler()
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

    def _fetch_forecast_data(self, lat: float, lon: float) -> List[float] | None:
        """
        Fetch professional 3-day rainfall forecast from Open-Meteo.

        Uses ECMWF/GFS/ICON ensemble models — same data backing paid weather services.
        Free, no API key required.

        Returns:
            List of 3 floats [day1_mm, day2_mm, day3_mm] or None on failure.
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "precipitation_sum",
            "forecast_days": 3,
            "timezone": "auto",
        }

        try:
            res = requests.get(OPEN_METEO_FORECAST_URL, params=params, timeout=10)
            res.raise_for_status()
            data = res.json()

            precip = data.get("daily", {}).get("precipitation_sum", [])
            if len(precip) < 3:
                logger.warning(f"Open-Meteo forecast returned {len(precip)} days, expected 3")
                return None

            forecast = [max(0.0, float(v)) if v is not None else 0.0 for v in precip[:3]]
            logger.info(f"Professional forecast (Open-Meteo): {forecast} mm")
            return forecast

        except Exception as e:
            logger.warning(f"Open-Meteo forecast fetch failed: {e}")
            return None

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
        # Fit full scaler on all 4 features
        scaled_data = self.scaler.fit_transform(df)

        # Fit rain-only scaler for proper inverse transform of predictions
        self.rain_scaler.fit(df[["rain"]].values)

        # Save both scalers for inference
        scaler_path = os.path.join(MODELS_DIR, f"scaler_{field_id}.joblib")
        rain_scaler_path = os.path.join(MODELS_DIR, f"rain_scaler_{field_id}.joblib")
        joblib.dump(self.scaler, scaler_path)
        joblib.dump(self.rain_scaler, rain_scaler_path)

        X, y = self._prepare_sequences(scaled_data)

        # 3. Train/Validation Split (80/20)
        split_idx = int(len(X) * 0.8)
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]

        X_train_t = torch.FloatTensor(X_train)
        y_train_t = torch.FloatTensor(y_train)
        X_val_t = torch.FloatTensor(X_val)
        y_val_t = torch.FloatTensor(y_val)

        # 4. Model Setup
        model = LSTMWeatherModel(input_size=self.input_size, hidden_size=64, num_layers=3, dropout=0.2)
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

        # 5. Training Loop with Early Stopping
        max_epochs = 200
        patience = 10
        best_val_loss = float('inf')
        epochs_no_improve = 0
        best_state = None

        for epoch in range(max_epochs):
            # Train
            model.train()
            optimizer.zero_grad()
            outputs = model(X_train_t)
            train_loss = criterion(outputs, y_train_t)
            train_loss.backward()
            optimizer.step()

            # Validate
            model.eval()
            with torch.no_grad():
                val_outputs = model(X_val_t)
                val_loss = criterion(val_outputs, y_val_t)

                # Compute validation MAE in mm (actual units)
                val_pred_scaled = val_outputs.numpy()
                val_pred_mm = self.rain_scaler.inverse_transform(val_pred_scaled)
                val_actual_mm = self.rain_scaler.inverse_transform(y_val)
                val_mae_mm = float(np.mean(np.abs(val_pred_mm - val_actual_mm)))

            # LR scheduler step
            scheduler.step(val_loss)

            # Early stopping check
            if val_loss.item() < best_val_loss:
                best_val_loss = val_loss.item()
                epochs_no_improve = 0
                best_state = model.state_dict().copy()
            else:
                epochs_no_improve += 1

            if (epoch + 1) % 10 == 0:
                current_lr = optimizer.param_groups[0]['lr']
                logger.info(
                    f"Field {field_id} | Epoch [{epoch+1}/{max_epochs}] "
                    f"Train Loss: {train_loss.item():.4f} | Val Loss: {val_loss.item():.4f} | "
                    f"Val MAE: {val_mae_mm:.2f} mm | LR: {current_lr:.6f}"
                )

            if epochs_no_improve >= patience:
                logger.info(f"Field {field_id} | Early stopping at epoch {epoch+1} (no improvement for {patience} epochs)")
                break

        # 6. Save best model
        if best_state is not None:
            model.load_state_dict(best_state)

        model_path = os.path.join(MODELS_DIR, f"model_{field_id}.pth")
        torch.save(model.state_dict(), model_path)
        logger.info(f"Trained and Saved Model: {model_path} (best val loss: {best_val_loss:.4f})")

    def predict_next_3_days(self, field_id: str, recent_data: List[Dict]) -> List[float]:
        """
        Predict rain for next 3 days using LSTM only.
        recent_data: List of last 7 days dicts [{'temp_max':.., 'rain':..}, ...]
        """
        model_path = os.path.join(MODELS_DIR, f"model_{field_id}.pth")
        scaler_path = os.path.join(MODELS_DIR, f"scaler_{field_id}.joblib")
        rain_scaler_path = os.path.join(MODELS_DIR, f"rain_scaler_{field_id}.joblib")

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            logger.warning(f"No model found for field {field_id}")
            return [0.0, 0.0, 0.0]

        try:
            # Load artifacts
            model = LSTMWeatherModel(input_size=self.input_size, hidden_size=64, num_layers=3)
            model.load_state_dict(torch.load(model_path))
            model.eval()

            scaler = joblib.load(scaler_path)

            # Load rain-specific scaler (fall back to dummy matrix approach for old models)
            rain_scaler = None
            if os.path.exists(rain_scaler_path):
                rain_scaler = joblib.load(rain_scaler_path)

            # Prepare Input
            df = pd.DataFrame(recent_data)
            df = df[["temp_max", "temp_min", "rain", "humidity"]]

            # Scale
            scaled = scaler.transform(df) # Shape (7, 4)
            input_tensor = torch.FloatTensor(scaled).unsqueeze(0) # (1, 7, 4)

            # Predict
            with torch.no_grad():
                prediction_scaled = model(input_tensor) # (1, 3)

            prediction_scaled = prediction_scaled.numpy()[0]  # shape (3,)

            # Inverse transform using rain-specific scaler
            if rain_scaler is not None:
                prediction_actual = rain_scaler.inverse_transform(
                    prediction_scaled.reshape(-1, 1)
                ).flatten()
            else:
                # Legacy fallback: dummy matrix approach for models trained before rain_scaler
                dummy = np.zeros((3, 4))
                dummy[:, 2] = prediction_scaled
                prediction_actual = scaler.inverse_transform(dummy)[:, 2]

            # Clip negative values
            prediction_actual = [max(0.0, float(x)) for x in prediction_actual]

            return prediction_actual

        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return [0.0, 0.0, 0.0]

    def predict_ensemble(self, field_id: str, lat: float, lon: float, recent_data: List[Dict]) -> List[float]:
        """
        Ensemble forecast: professional Open-Meteo forecast + local LSTM correction.

        Weighting:
        - If LSTM model exists: 0.7 * professional + 0.3 * lstm
        - If no LSTM model:     1.0 * professional
        - If professional fails: 1.0 * lstm (fallback)
        - If both fail:          [0.0, 0.0, 0.0]

        Args:
            field_id: Field identifier for loading LSTM model
            lat: Field latitude
            lon: Field longitude
            recent_data: Last 7 days of weather dicts for LSTM input

        Returns:
            List of 3 floats — predicted rainfall in mm for next 3 days.
        """
        # Fetch professional forecast
        pro_forecast = self._fetch_forecast_data(lat, lon)

        # Fetch LSTM prediction
        lstm_forecast = self.predict_next_3_days(field_id, recent_data)

        # Check if LSTM model actually exists (not just returning zeros)
        model_path = os.path.join(MODELS_DIR, f"model_{field_id}.pth")
        has_lstm = os.path.exists(model_path)

        if has_lstm:
            logger.info(f"LSTM forecast: {lstm_forecast} mm")

        if pro_forecast is not None and has_lstm:
            # Ensemble: weighted average
            ensemble = [
                0.7 * pro + 0.3 * lstm
                for pro, lstm in zip(pro_forecast, lstm_forecast)
            ]
            logger.info(f"Ensemble forecast (0.7*pro + 0.3*lstm): {ensemble} mm")
            return ensemble

        if pro_forecast is not None:
            # Professional only (no LSTM model for this field)
            logger.info("Using professional forecast only (no LSTM model)")
            return pro_forecast

        if has_lstm:
            # LSTM only (professional forecast failed)
            logger.info("Professional forecast unavailable, using LSTM only")
            return lstm_forecast

        # Both unavailable
        logger.warning("Both professional forecast and LSTM unavailable")
        return [0.0, 0.0, 0.0]

weather_ml_service = WeatherMLService()
