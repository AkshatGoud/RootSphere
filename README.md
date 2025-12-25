# Smart Multi-Modal Soil & Crop Health Prediction System

## Requirements
- Docker & Docker Compose
- Python 3.11+ (for local development)

## Quick Start

1. **Start the System**
   ```bash
   docker compose up --build -d
   ```

2. **Run Migrations**
   ```bash
   docker compose exec api alembic upgrade head
   ```
   *Note: If running locally without docker exec, ensure `DATABASE_URL` is set.*

3. **Run Simulator**
   ```bash
   docker compose exec api python tools/simulate_field.py
   ```

4. **Run Tests**
   ```bash
   docker compose exec api pytest -q
   ```

## API Documentation
Once running, visit: http://localhost:8000/docs


### Phase 3: Enhancements
- Data History
- Feedback Loop
- Observability (Request ID, JSON logs)

## API Endpoints

### Data
- `POST /farmers`: Create farmer
- `POST /fields`: Create field
- `POST /ingest/sensor`: Submit soil sensor readings
- `POST /ingest/weather`: Submit weather data
- `POST /ingest/image`: Submit image metadata

### Core
- `GET /field/{field_id}/latest`: Get canonical field snapshot
- `POST /recommend/{field_id}`: Generate recommendation

### History & Feedback
- `GET /recommendations?field_id=...&limit=50`: Browse past recommendations
- `GET /sensor_readings?field_id=...`: Browse sensor history
- `POST /feedback`: Submit feedback on recommendation
    ```bash
    curl -X POST "http://localhost:8000/feedback" \
         -H "Content-Type: application/json" \
         -d '{"field_id": "...", "recommendation_id": "...", "followed": true, "outcome": "Success"}'
    ```

### Ops
- `GET /health`
- `GET /ready`

## Development
- `api/`: Application code
- `contracts/`: Data schemas
- `migrations/`: DB migrations
- `tools/`: Utilities (simulator)
