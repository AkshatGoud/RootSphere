#!/usr/bin/env python3
"""
Manually train a weather model for a field.

This script trains the LSTM model for a specific field without needing
to create a new field via the API.

Usage:
    python tools/train_field_model.py --field-id <id> --lat <lat> --lon <lon>
"""

import sys
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.services.weather_ml import weather_ml_service

def main():
    parser = argparse.ArgumentParser(description='Train weather model for a field')
    parser.add_argument('--field-id', type=str, required=True, help='ID of the field')
    parser.add_argument('--lat', type=float, required=True, help='Latitude')
    parser.add_argument('--lon', type=float, required=True, help='Longitude')
    
    args = parser.parse_args()
    
    print(f"🚀 Training weather model for field: {args.field_id}")
    print(f"   Location: ({args.lat}, {args.lon})")
    print()
    
    try:
        weather_ml_service.train_model_for_field(args.field_id, args.lat, args.lon)
        print()
        print("✅ Training complete!")
        print(f"   Model saved to: api/ml/models/model_{args.field_id}.pth")
        print(f"   Scaler saved to: api/ml/models/scaler_{args.field_id}.joblib")
        print()
        print("💡 Now you can run the validation script:")
        print(f"   python tools/validate_weather_model.py --field-id {args.field_id} --lat {args.lat} --lon {args.lon}")
    except Exception as e:
        print(f"❌ Training failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
