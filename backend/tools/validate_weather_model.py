#!/usr/bin/env python3
"""
Weather Model Validation Script

This script validates the accuracy of the LSTM weather prediction model by:
1. Testing predictions against actual historical weather data
2. Calculating accuracy metrics (MAE, RMSE, R²)
3. Generating comparison visualizations

Usage:
    python tools/validate_weather_model.py --field-id <field_id>
    
    Or to validate all existing models:
    python tools/validate_weather_model.py --all
"""

import sys
import os
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from api.services.weather_ml import WeatherMLService
import glob

def validate_model(field_id: str, lat: float, lon: float):
    """
    Validate a single model by testing on recent historical data.
    
    Args:
        field_id: ID of the field
        lat: Latitude
        lon: Longitude
    
    Returns:
        Dictionary with validation metrics
    """
    print(f"\n{'='*60}")
    print(f"Validating Weather Model for Field: {field_id}")
    print(f"Location: ({lat}, {lon})")
    print(f"{'='*60}\n")
    
    service = WeatherMLService()
    
    # Step 1: Fetch historical data (2 years)
    print("⏳ Fetching historical weather data...")
    try:
        df = service._fetch_historical_data(lat, lon, years=2)
        print(f"✅ Fetched {len(df)} days of historical data")
    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        return None
    
    if len(df) < 30:
        print("⚠️  Not enough data for validation (need at least 30 days)")
        return None
    
    # Step 2: Split data - use last 30 days for testing
    test_size = 30
    train_df = df[:-test_size]
    test_df = df[-test_size:]
    
    print(f"\n📊 Data Split:")
    print(f"   Training: {len(train_df)} days")
    print(f"   Testing:  {len(test_df)} days")
    
    # Step 3: Load the trained model
    from api.ml.lstm import LSTMWeatherModel
    import torch
    import joblib
    
    model_path = f"api/ml/models/model_{field_id}.pth"
    scaler_path = f"api/ml/models/scaler_{field_id}.joblib"
    
    if not os.path.exists(model_path):
        print(f"❌ Model not found at {model_path}")
        print("   Please create a field first to trigger model training.")
        return None
    
    print(f"\n🤖 Loading trained model...")
    # Use upgraded architecture parameters
    model = LSTMWeatherModel(input_size=4, hidden_size=64, num_layers=3)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    scaler = joblib.load(scaler_path)
    print("✅ Model and scaler loaded")
    
    # Step 4: Make predictions on test data
    print(f"\n🔮 Generating predictions...")
    predictions = []
    actuals = []
    
    # Use a sliding window over test data
    for i in range(len(test_df) - 10):  # Need 7 days history + 3 days future
        # Get 7 days of history
        history = test_df.iloc[i:i+7]
        
        # Get actual next 3 days
        actual_next_3 = test_df.iloc[i+7:i+10]['rain'].values
        
        if len(actual_next_3) < 3:
            break
        
        # Prepare input
        history_scaled = scaler.transform(history[['temp_max', 'temp_min', 'rain', 'humidity']])
        input_tensor = torch.FloatTensor(history_scaled).unsqueeze(0)
        
        # Predict
        with torch.no_grad():
            pred_scaled = model(input_tensor).numpy()[0]
        
        # Inverse transform
        dummy = np.zeros((3, 4))
        dummy[:, 2] = pred_scaled
        pred_actual = scaler.inverse_transform(dummy)[:, 2]
        pred_actual = np.maximum(0, pred_actual)  # Clip negatives
        
        predictions.append(pred_actual)
        actuals.append(actual_next_3)
    
    predictions = np.array(predictions)
    actuals = np.array(actuals)
    
    print(f"✅ Generated {len(predictions)} 3-day predictions")
    
    # Step 5: Calculate metrics
    print(f"\n📈 Accuracy Metrics:")
    print(f"{'─'*60}")
    
    # Flatten for overall metrics
    pred_flat = predictions.flatten()
    actual_flat = actuals.flatten()
    
    mae = mean_absolute_error(actual_flat, pred_flat)
    rmse = np.sqrt(mean_squared_error(actual_flat, pred_flat))
    r2 = r2_score(actual_flat, pred_flat)
    
    # Calculate per-day metrics
    day_metrics = []
    for day in range(3):
        day_mae = mean_absolute_error(actuals[:, day], predictions[:, day])
        day_rmse = np.sqrt(mean_squared_error(actuals[:, day], predictions[:, day]))
        day_metrics.append((day_mae, day_rmse))
    
    print(f"   Overall MAE:  {mae:.2f} mm  (Mean Absolute Error)")
    print(f"   Overall RMSE: {rmse:.2f} mm  (Root Mean Squared Error)")
    print(f"   R² Score:     {r2:.4f}  (1.0 = perfect, 0.0 = baseline)")
    print(f"\n   Per-Day Breakdown:")
    for day, (day_mae, day_rmse) in enumerate(day_metrics, 1):
        print(f"      Day +{day}: MAE={day_mae:.2f}mm, RMSE={day_rmse:.2f}mm")
    
    # Interpretation
    print(f"\n💡 Interpretation:")
    if mae < 2.0:
        print("   🟢 Excellent accuracy! Predictions are very close to actual values.")
    elif mae < 5.0:
        print("   🟡 Good accuracy. Predictions are reasonably accurate.")
    elif mae < 10.0:
        print("   🟠 Moderate accuracy. Predictions show general trends.")
    else:
        print("   🔴 Low accuracy. Model may need more training data or tuning.")
    
    if r2 > 0.7:
        print("   🟢 Strong predictive power (R² > 0.7)")
    elif r2 > 0.4:
        print("   🟡 Moderate predictive power (R² > 0.4)")
    else:
        print("   🔴 Weak predictive power (R² < 0.4)")
    
    # Step 6: Generate visualization
    print(f"\n📊 Generating visualization...")
    
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle(f'LSTM Weather Model Validation - Field {field_id}', fontsize=16, fontweight='bold')
    
    # Plot 1: Actual vs Predicted (scatter)
    ax1 = axes[0, 0]
    ax1.scatter(actual_flat, pred_flat, alpha=0.5, s=30)
    ax1.plot([actual_flat.min(), actual_flat.max()], 
             [actual_flat.min(), actual_flat.max()], 
             'r--', lw=2, label='Perfect Prediction')
    ax1.set_xlabel('Actual Rainfall (mm)', fontsize=11)
    ax1.set_ylabel('Predicted Rainfall (mm)', fontsize=11)
    ax1.set_title('Actual vs Predicted Rainfall', fontsize=12, fontweight='bold')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Time series comparison (first 10 predictions)
    ax2 = axes[0, 1]
    n_show = min(10, len(predictions))
    x_vals = np.arange(n_show * 3)
    
    actual_series = actuals[:n_show].flatten()
    pred_series = predictions[:n_show].flatten()
    
    ax2.plot(x_vals, actual_series, 'o-', label='Actual', linewidth=2, markersize=6)
    ax2.plot(x_vals, pred_series, 's--', label='Predicted', linewidth=2, markersize=6)
    ax2.set_xlabel('Time Step (days)', fontsize=11)
    ax2.set_ylabel('Rainfall (mm)', fontsize=11)
    ax2.set_title(f'Prediction Timeline (First {n_show} Windows)', fontsize=12, fontweight='bold')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # Plot 3: Error distribution
    ax3 = axes[1, 0]
    errors = pred_flat - actual_flat
    ax3.hist(errors, bins=30, edgecolor='black', alpha=0.7)
    ax3.axvline(0, color='red', linestyle='--', linewidth=2, label='Zero Error')
    ax3.set_xlabel('Prediction Error (mm)', fontsize=11)
    ax3.set_ylabel('Frequency', fontsize=11)
    ax3.set_title('Error Distribution', fontsize=12, fontweight='bold')
    ax3.legend()
    ax3.grid(True, alpha=0.3, axis='y')
    
    # Plot 4: Metrics summary (text)
    ax4 = axes[1, 1]
    ax4.axis('off')
    
    metrics_text = f"""
    ACCURACY METRICS
    {'─'*30}
    
    Overall Performance:
      • MAE:  {mae:.2f} mm
      • RMSE: {rmse:.2f} mm
      • R²:   {r2:.4f}
    
    Per-Day Performance:
      • Day +1: MAE={day_metrics[0][0]:.2f}mm
      • Day +2: MAE={day_metrics[1][0]:.2f}mm
      • Day +3: MAE={day_metrics[2][0]:.2f}mm
    
    Data Summary:
      • Training: {len(train_df)} days
      • Testing:  {len(test_df)} days
      • Predictions: {len(predictions)} windows
    """
    
    ax4.text(0.1, 0.5, metrics_text, transform=ax4.transAxes,
             fontsize=11, verticalalignment='center',
             fontfamily='monospace',
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))
    
    plt.tight_layout()
    
    # Save plot
    output_dir = Path("api/ml/models/validation")
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / f"validation_{field_id}.png"
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"✅ Visualization saved to: {output_path}")
    
    # Show plot
    plt.show()
    
    return {
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        'day_metrics': day_metrics,
        'num_predictions': len(predictions)
    }


def find_existing_models():
    """Find all existing trained models."""
    model_pattern = "api/ml/models/model_*.pth"
    model_files = glob.glob(model_pattern)
    
    field_ids = []
    for model_file in model_files:
        # Extract field_id from filename: model_<field_id>.pth
        field_id = Path(model_file).stem.replace('model_', '')
        field_ids.append(field_id)
    
    return field_ids


def main():
    parser = argparse.ArgumentParser(description='Validate LSTM weather prediction models')
    parser.add_argument('--field-id', type=str, help='ID of the field to validate')
    parser.add_argument('--lat', type=float, help='Latitude of the field')
    parser.add_argument('--lon', type=float, help='Longitude of the field')
    parser.add_argument('--all', action='store_true', help='Validate all existing models')
    
    args = parser.parse_args()
    
    if args.all:
        print("🔍 Searching for existing models...")
        field_ids = find_existing_models()
        
        if not field_ids:
            print("❌ No trained models found.")
            print("   Create a field first to trigger model training.")
            return
        
        print(f"✅ Found {len(field_ids)} trained model(s)")
        
        # Note: We need coordinates from database for each field
        # For now, we'll skip this and require explicit field-id
        print("\n⚠️  To validate a specific model, use:")
        print("   python tools/validate_weather_model.py --field-id <id> --lat <lat> --lon <lon>")
        print("\n   Available field IDs:")
        for fid in field_ids:
            print(f"   - {fid}")
        
    elif args.field_id and args.lat and args.lon:
        result = validate_model(args.field_id, args.lat, args.lon)
        
        if result:
            print(f"\n{'='*60}")
            print("✅ Validation Complete!")
            print(f"{'='*60}")
        else:
            print("\n❌ Validation failed. Check logs above for details.")
    
    else:
        print("❌ Missing required arguments.")
        print("\nUsage:")
        print("  python tools/validate_weather_model.py --field-id <id> --lat <lat> --lon <lon>")
        print("\nExample:")
        print("  python tools/validate_weather_model.py --field-id 2a11c221-ed75-4325-b5a9-9838bf92b024 --lat 10.78 --lon 79.13")
        print("\nOr:")
        print("  python tools/validate_weather_model.py --all")


if __name__ == '__main__':
    main()
