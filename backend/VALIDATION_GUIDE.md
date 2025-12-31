# Weather Model Validation Guide

This guide helps you validate the accuracy of the LSTM weather prediction model.

## Quick Start

The easiest way to check accuracy is to run the validation script. It will:
1. Test the model on historical data it hasn't seen before
2. Calculate accuracy metrics (MAE, RMSE, R²)
3. Generate comparison visualizations

## Method 1: Using the Validation Script (Recommended)

### Inside Docker Container

```bash
# Enter the API container
docker-compose exec api bash

# Run validation for a specific field
# Replace with your actual field ID and coordinates
python tools/validate_weather_model.py \
  --field-id 2a11c221-ed75-4325-b5a9-9838bf92b024 \
  --lat 10.78 \
  --lon 79.13
```

### Outside Docker (Alternative)

```bash
cd backend
python tools/validate_weather_model.py \
  --field-id <your-field-id> \
  --lat <latitude> \
  --lon <longitude>
```

## Understanding the Metrics

The validation script outputs several accuracy metrics:

### 1. **MAE (Mean Absolute Error)**
- Measures average prediction error in millimeters
- **Good**: < 2mm (predictions very close to actual)
- **Acceptable**: 2-5mm (reasonably accurate)
- **Needs improvement**: > 10mm

### 2. **RMSE (Root Mean Squared Error)**
- Similar to MAE but penalizes large errors more
- Lower is better
- Typically 1.5-2x higher than MAE

### 3. **R² Score (Coefficient of Determination)**
- Measures how well predictions explain actual variance
- **Excellent**: > 0.7 (strong predictive power)
- **Good**: 0.4-0.7 (moderate predictive power)
- **Poor**: < 0.4 (weak predictive power)
- **Perfect**: 1.0 (impossible in practice)

## Sample Output

```
===========================================
Validating Weather Model for Field: 2a11c221-ed75-4325-b5a9-9838bf92b024
Location: (10.78, 79.13)
============================================

⏳ Fetching historical weather data...
✅ Fetched 730 days of historical data

📊 Data Split:
   Training: 700 days
   Testing:  30 days

🤖 Loading trained model...
✅ Model and scaler loaded

🔮 Generating predictions...
✅ Generated 20 3-day predictions

📈 Accuracy Metrics:
────────────────────────────────────────────────────────────
   Overall MAE:  3.45 mm  (Mean Absolute Error)
   Overall RMSE: 4.82 mm  (Root Mean Squared Error)
   R² Score:     0.6234  (1.0 = perfect, 0.0 = baseline)

   Per-Day Breakdown:
      Day +1: MAE=2.34mm, RMSE=3.21mm
      Day +2: MAE=3.67mm, RMSE=4.89mm
      Day +3: MAE=4.33mm, RMSE=6.12mm

💡 Interpretation:
   🟡 Good accuracy. Predictions are reasonably accurate.
   🟡 Moderate predictive power (R² > 0.4)

📊 Generating visualization...
✅ Visualization saved to: api/ml/models/validation/validation_2a11c221-ed75-4325-b5a9-9838bf92b024.png
```

## Visualization Plots

The script generates 4 plots:

1. **Actual vs Predicted Scatter**: Should cluster around the diagonal line
2. **Time Series Comparison**: Shows how predictions track actual values
3. **Error Distribution**: Should be centered around zero
4. **Metrics Summary**: Text display of all metrics

## Finding Your Field ID

You can find your field ID from the URL when viewing a field:
```
http://localhost:8080/field/2a11c221-ed75-4325-b5a9-9838bf92b024/recommend
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                            This is your field ID
```

Or query the database:
```bash
docker-compose exec api python -c "
from api.database import SessionLocal
from api import crud

db = SessionLocal()
fields = crud.get_fields(db, skip=0, limit=10)
for field in fields:
    print(f'{field.id} | {field.name} | ({field.lat}, {field.lon})')
db.close()
"
```

## Method 2: Manual Comparison

You can also manually verify by:

1. **Check historical accuracy**: Compare the chart's historical data (left side) with your known weather records
2. **Wait for future validation**: Note the 3-day forecast, then check back in 3 days to see how close it was
3. **Compare with weather services**: Check if predictions align with professional weather forecasts

## Improving Accuracy

If accuracy is low, try:

1. **More training data**: Model trains on 2 years of data; more data = better predictions
2. **Re-train the model**: Delete the model file and create the field again to trigger retraining
3. **Check data quality**: Ensure the weather API data is valid for your location
4. **Adjust model parameters**: Edit `api/services/weather_ml.py` to tune hyperparameters

## Expected Performance

For rainfall prediction:
- **Near-term (Day +1)**: Should be most accurate (MAE 2-4mm)
- **Medium-term (Day +2)**: Moderate accuracy (MAE 3-6mm)  
- **Long-term (Day +3)**: Lower accuracy (MAE 4-8mm)

Weather is inherently chaotic, so perfect prediction is impossible. The model aims to capture general trends and patterns.

## Troubleshooting

**Error: Model not found**
- Create the field first to trigger automatic model training

**Error: Not enough data**
- The field needs at least 2 years of historical weather data from the API

**Low R² score**
- Normal for regions with erratic weather patterns
- Consider the model as a "trend indicator" rather than exact predictor

**Visualization not showing**
- The plot is saved to `api/ml/models/validation/` directory
- View the PNG file directly if the plot window doesn't open
