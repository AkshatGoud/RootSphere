# RootSphere AI

Smart multi-modal soil and crop health prediction system for precision agriculture. RootSphere synthesizes IoT soil sensor data, hyper-local weather forecasts, and LSTM-based rainfall prediction to deliver actionable farming recommendations.

## Features

- **Real-time Field Monitoring** — Live dashboards for soil NPK, pH, moisture, temperature, humidity, and rainfall.
- **LSTM Weather Forecasting** — Per-field bidirectional LSTM models trained on 2 years of Open-Meteo historical data predict 3-day rainfall.
- **Hybrid Recommendation Engine** — Combines ICAR/TNAU scientific standards with AI weather models. Detects conflicts between API forecasts and ML predictions and issues risk alerts.
- **Sensor Management** — Register, assign, and simulate IoT sensors (soil probes, weather stations). Track assignments and generate live readings.
- **JWT Authentication** — Secure token-based auth with per-user data isolation. Each farmer sees only their own fields, sensors, and recommendations.
- **Multilingual UI** — English, Hindi, Telugu, and Tamil with persistent language preference.
- **Geolocation** — Leaflet-based map integration for field location selection.
- **Recommendation History & Feedback** — Track past recommendations, rate outcomes, and close the feedback loop.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts, React Leaflet |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic |
| Database | PostgreSQL 15 |
| ML/AI | PyTorch (Stacked Bi-LSTM), Scikit-Learn, Open-Meteo API |
| Auth | JWT (python-jose), Argon2 password hashing |
| Infra | Docker, Docker Compose |

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Python 3.11+** (only if running backend locally without Docker)
- **Node.js 20+** (only if running frontend locally without Docker)

## Quick Start (Docker)

```bash
# Clone and enter the project
git clone <repository-url>
cd RootSphere

# Build and start all services
docker compose up --build -d

# Apply database migrations
docker compose exec api alembic upgrade head
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| API (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

### First Steps

1. Open http://localhost:8080 and register a new account.
2. Create a field — weather data is automatically fetched and an LSTM model begins training in the background.
3. Register a sensor and assign it to your field.
4. Simulate sensor readings and generate AI-powered recommendations.

## Local Development (Without Docker)

### Backend

```bash
cd backend
pip install -e .[dev]

# Set database URL (default: PostgreSQL)
export DATABASE_URL=postgresql://user:password@localhost:5432/smartsoil

# Run migrations
alembic upgrade head

# Start the API server
uvicorn api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend/nomad-fields/RootSphere-Frontend
npm install

# Point to backend API
export VITE_API_BASE_URL=http://127.0.0.1:8000

npm run dev -- --host --port 8080
```

## API Endpoints

### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/farmers` | Register new account |
| POST | `/login` | Authenticate and get JWT token |
| POST | `/auth/forgot-password` | Request password reset code |
| POST | `/auth/reset-password` | Reset password with code |
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check (verifies DB connection) |

### Protected (Bearer Token Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fields` | List authenticated farmer's fields |
| POST | `/fields` | Create a new field (auto-fetches weather, trains ML model) |
| GET | `/fields/{field_id}` | Get field details |
| PUT | `/fields/{field_id}` | Update field |
| GET | `/field/{field_id}/latest` | Get unified dashboard snapshot (sensor + weather + images) |
| POST | `/recommend/{field_id}` | Generate AI recommendation (hybrid LSTM + rules) |
| GET | `/recommendations` | List recommendation history for a field |
| POST | `/feedback` | Submit recommendation feedback |
| GET | `/sensors` | List farmer's sensors |
| POST | `/sensors` | Register a new sensor |
| GET | `/sensors/{sensor_id}` | Get sensor details |
| POST | `/sensors/{sensor_id}/assign` | Assign sensor to a field |
| POST | `/sensors/{sensor_id}/simulate` | Generate simulated sensor reading |
| POST | `/ingest/sensor` | Push IoT soil sensor data |
| POST | `/ingest/weather` | Push weather data |
| POST | `/ingest/image` | Upload crop image |
| DELETE | `/images/{image_id}` | Delete a crop image |

All protected endpoints require the `Authorization: Bearer <token>` header. The token is obtained from the `/login` endpoint.

## Project Structure

```
RootSphere/
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI app and all endpoints
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── crud.py              # Database operations
│   │   ├── recommendation.py    # Hybrid recommendation engine
│   │   ├── db.py                # Database connection setup
│   │   ├── services/
│   │   │   ├── auth.py          # JWT auth and password hashing
│   │   │   ├── weather.py       # Open-Meteo weather fetching
│   │   │   └── weather_ml.py    # LSTM rainfall prediction model
│   │   └── ml/models/           # Saved PyTorch model weights per field
│   ├── migrations/              # Alembic database migrations
│   ├── tools/                   # Data simulation scripts
│   ├── tests/                   # Backend test suite
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   └── nomad-fields/RootSphere-Frontend/
│       ├── src/
│       │   ├── pages/           # Route pages (Login, Fields, Sensors, etc.)
│       │   ├── components/      # Reusable UI components (shadcn/ui)
│       │   ├── contexts/        # React contexts (Language i18n)
│       │   ├── lib/             # API client, storage utilities
│       │   └── types/           # TypeScript type definitions
│       ├── Dockerfile
│       └── package.json
├── docker-compose.yml
└── README.md
```

## ML Architecture

The LSTM weather forecasting model is trained per-field:

1. **Data**: 2 years of historical weather from Open-Meteo (temperature, humidity, precipitation).
2. **Model**: 3-layer bidirectional LSTM with 64 hidden units and dropout (0.2).
3. **Input**: 7-day sliding window of 4 weather features.
4. **Output**: 3-day rainfall forecast (mm).
5. **Training**: Triggered automatically when a field is created. 100 epochs with Adam optimizer and MSE loss.
6. **Inference**: Recent 7 days of weather data are fed through the model to predict upcoming rainfall, which is combined with the Open-Meteo API forecast in the recommendation engine.

## Authentication Flow

1. User registers via `/farmers` with email, password, name, and phone.
2. Login via `/login` returns a JWT token (valid for 30 days).
3. The frontend stores the token in `localStorage` and sends it as `Authorization: Bearer <token>` on every API request.
4. The backend decodes the token on each protected endpoint to identify the farmer and scope all data queries to that farmer's records.
5. If the token expires or is invalid, the frontend receives a 401 and redirects to login.

## Testing

```bash
# Run backend tests
docker compose exec api pytest -v

# Build frontend (type checking)
cd frontend/nomad-fields/RootSphere-Frontend && npm run build
```

## Sustainable Development Goals

This project supports **UN SDG 2: Zero Hunger** (Target 2.4 — Sustainable Food Production) by optimizing water and fertilizer usage through data-driven recommendations, and **SDG 12: Responsible Consumption** by reducing agricultural resource waste.
