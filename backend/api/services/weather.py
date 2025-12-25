import requests
import datetime
import logging
from typing import List, Optional, Tuple
from .. import schemas

logger = logging.getLogger("api")

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

def fetch_live_weather(lat: float, lon: float, field_id: str) -> Tuple[Optional[schemas.WeatherReadingCreate], List[schemas.WeatherReadingCreate]]:
    """
    Fetches current weather and 7-day forecast from Open-Meteo.
    Returns: (CurrentReading, List[ForecastReadings])
    """
    try:
        # Fetch current weather + forecast
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,rain",
            "hourly": "temperature_2m,relative_humidity_2m,rain",
            "forecast_days": 3 # 72 hours approx
        }
        
        response = requests.get(OPEN_METEO_URL, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # 1. Parse Current Weather
        current = data.get("current", {})
        ts_now = datetime.datetime.utcnow()
        
        current_reading = schemas.WeatherReadingCreate(
            field_id=field_id,
            ts=ts_now,
            temp_c=current.get("temperature_2m", 0.0),
            humidity_pct=current.get("relative_humidity_2m", 0.0),
            rainfall_mm=current.get("rain", 0.0)
        )
        
        # 2. Parse Forecast (Hourly)
        forecast_readings = []
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        humidities = hourly.get("relative_humidity_2m", [])
        rains = hourly.get("rain", [])
        
        # Open-Meteo returns ISO strings. We take every 6th hour to match our simulator style/reduce data
        for i, t_str in enumerate(times):
            if i % 6 != 0: continue # optimized step
            
            # Simple ISO parsing (Open-Meteo usually "2023-10-10T12:00")
            try:
                ts = datetime.datetime.fromisoformat(t_str)
            except ValueError:
                continue
                
            forecast_readings.append(schemas.WeatherReadingCreate(
                field_id=field_id,
                ts=ts,
                temp_c=temps[i],
                humidity_pct=humidities[i],
                rainfall_mm=rains[i]
            ))
            
        return current_reading, forecast_readings

    except Exception as e:
        logger.error(f"Failed to fetch weather from Open-Meteo: {e}")
        return None, []
