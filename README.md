# RootSphere AI

Smart, multi-modal soil and crop health platform for precision agriculture. RootSphere fuses IoT soil sensor telemetry, hyper-local weather forecasts, per-field LSTM rainfall prediction, multimodal image disease detection, and a local-first conversational AI assistant to deliver actionable, low-bandwidth recommendations to farmers.

## Features

- **Real-time field monitoring** — Live dashboards for soil NPK, pH, moisture, temperature, humidity, and rainfall.
- **Per-field LSTM weather forecasting** — Bidirectional LSTM trained on 2 years of Open-Meteo data forecasts 3-day rainfall.
- **Hybrid recommendation engine** — Merges ICAR/TNAU scientific standards with the LSTM and Open-Meteo forecast; flags conflicts as risk alerts.
- **Image disease detection** — Upload a crop photo and get a diagnosis. Primary path is a local multimodal LLM via Ollama; falls back to Gemini → OpenAI → Groq → HuggingFace → keyword heuristics.
- **Conversational AI assistant** — "Ask your field" chat at the field level and a cross-field chat on the dashboard, both grounded in live sensor, weather, and recommendation context. Powered by host Ollama (`gemma4:e2b`) for Apple Silicon Metal acceleration.
- **Sensor management** — Register, assign, and simulate IoT sensors (soil probes, weather stations).
- **Authentication** — JWT (Argon2 password hashing), Google Sign-In, password reset and email-change flows via transactional email (Resend).
- **Multilingual UI** — English, Hindi, Telugu, Tamil via `react-i18next`.
- **Geolocation** — Leaflet-based map for field placement.
- **Recommendation history & feedback** — Track past recommendations, rate outcomes, close the loop.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI / shadcn/ui, Recharts, React Leaflet, react-i18next |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic |
| Database | PostgreSQL 15 |
| ML / AI | PyTorch (stacked Bi-LSTM), scikit-learn, Ollama (`gemma4:e2b` chat + vision), Open-Meteo API |
| Vision fallbacks | Google Gemini, OpenAI, Groq, HuggingFace |
| Auth | JWT (`python-jose`), Argon2, Google OAuth |
| Email | Resend |
| Infra | Docker, Docker Compose, Render.com (`render.yaml`) |

## Architecture

```
                       ┌──────────────────────┐
                       │   Frontend (Vite)    │
                       │  React + TS + i18n   │
                       └──────────┬───────────┘
                                  │ JWT / REST
                                  ▼
┌──────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│  Open-Meteo  │◄────────┤   FastAPI backend    ├────────►│  Postgres 15     │
└──────────────┘         │  (auth, fields,      │         └──────────────────┘
┌──────────────┐         │   sensors, recs,     │         ┌──────────────────┐
│  Resend      │◄────────┤   chat, image AI)    ├────────►│  Host Ollama     │
└──────────────┘         └──────────┬───────────┘         │  gemma4:e2b      │
                                    │                     │  (Metal GPU)     │
                                    ▼                     └──────────────────┘
                       ┌────────────────────────┐
                       │ Optional cloud vision  │
                       │ Gemini / OpenAI / Groq │
                       └────────────────────────┘
```

## Prerequisites

- **Docker** and **Docker Compose**
- **Host Ollama** (recommended on Apple Silicon) with `gemma4:e2b` pulled — used for chat and image AI. The compose file points the API at `host.docker.internal:11434` for Metal-accelerated inference. A bundled `ollama` container is also started for fallback / non-Mac hosts; switch `OLLAMA_HOST` accordingly.
- **Python 3.11+** (only for running the backend without Docker)
- **Node.js 20+** (only for running the frontend without Docker)

Install Ollama and pull the model:

```bash
brew install ollama
ollama serve &              # or run the macOS app
ollama pull gemma4:e2b      # or gemma3:4b on lower-RAM machines
```

## Quick Start (Docker)

```bash
git clone <repository-url>
cd RootSphere

# Configure secrets
cp backend/.env.example backend/.env
# Generate a SECRET_KEY:
python -c 'import secrets; print(secrets.token_urlsafe(32))'
# Paste it into backend/.env, then optionally fill GEMINI_API_KEY, GOOGLE_CLIENT_ID, RESEND_API_KEY.

# Build and start everything
docker compose up --build -d

# Apply database migrations
docker compose exec api alembic upgrade head
```

### Access points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| API (Swagger) | http://localhost:8000/docs |
| Health | http://localhost:8000/health |
| Ollama | http://localhost:11434 |
| Postgres | localhost:5432 (`user` / `password` / `smartsoil`) |

### First steps

1. Open http://localhost:8080 and register (or sign in with Google).
2. Create a field — weather is auto-fetched and an LSTM model begins training in the background.
3. Register a sensor and assign it to the field.
4. Simulate a reading, then generate an AI recommendation.
5. Upload a crop photo for disease detection.
6. Open the chat to ask questions about the field or your whole farm.

## Local Development (without Docker)

### Backend

```bash
cd backend
pip install -e .[dev]

export DATABASE_URL=postgresql://user:password@localhost:5432/smartsoil
export SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=gemma4:e2b

alembic upgrade head
uvicorn api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend/nomad-fields/RootSphere-Frontend
npm install
export VITE_API_BASE_URL=http://127.0.0.1:8000
npm run dev -- --host --port 8080
```

## Environment Variables

Defined in `backend/.env.example` and `docker-compose.yml`.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | yes | `postgresql://user:password@db:5432/smartsoil` | Postgres connection string |
| `SECRET_KEY` | yes | — | JWT signing key (32+ random bytes) |
| `API_PORT` | no | `8000` | API listen port |
| `CORS_ORIGINS` | no | `http://localhost:8080` | Comma-separated allowed origins |
| `OLLAMA_HOST` | no | `http://localhost:11434` | Ollama endpoint (use `http://host.docker.internal:11434` from Docker on Mac) |
| `OLLAMA_MODEL` | no | `gemma4:e2b` | Local model used for chat and image AI |
| `OLLAMA_TIMEOUT_S` | no | `120` | Per-request timeout for Ollama |
| `GEMINI_API_KEY` | no | — | Google Gemini fallback for vision |
| `OPENAI_API_KEY` | no | — | OpenAI fallback for vision |
| `GROQ_API_KEY` | no | — | Groq fallback for vision |
| `GOOGLE_CLIENT_ID` | no | — | Enables `POST /auth/google` |
| `RESEND_API_KEY` | no | — | Enables password-reset and email-change emails |
| `EMAIL_FROM` | no | `RootSphere <onboarding@resend.dev>` | From address on outbound mail |
| `VITE_API_BASE_URL` | yes (frontend) | `http://localhost:8000` | Backend URL the frontend calls |
| `VITE_GOOGLE_CLIENT_ID` | no (frontend) | — | Google sign-in client ID |

## API Endpoints

### Health & readiness

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check (verifies DB) |

### Auth (public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/farmers` | Register new account |
| POST | `/login` | Email/password login → JWT |
| POST | `/login/token` | OAuth2 form-style alias of `/login` |
| POST | `/auth/google` | Google Sign-In → JWT |
| POST | `/auth/forgot-password` | Send reset code via email |
| POST | `/auth/reset-password` | Reset password with code |

### Account management (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/farmers/{farmer_id}` | Get farmer profile |
| PUT | `/farmers/{farmer_id}` | Update profile |
| POST | `/farmers/{farmer_id}/reset` | Admin/self password reset |
| POST | `/farmers/{farmer_id}/email/request-change` | Request email change (sends verification) |
| POST | `/farmers/{farmer_id}/email/verify-change` | Confirm email change with code |

### Fields (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fields` | List your fields |
| POST | `/fields` | Create a field (auto-fetches weather, trains LSTM) |
| GET | `/fields/{field_id}` | Get field details |
| PUT | `/fields/{field_id}` | Update field |
| DELETE | `/fields/{field_id}` | Delete field |
| GET | `/field/{field_id}/latest` | Unified dashboard snapshot |

### Sensors (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sensors` | List your sensors |
| POST | `/sensors` | Register a sensor |
| GET | `/sensors/{sensor_id}` | Get sensor details |
| DELETE | `/sensors/{sensor_id}` | Delete a sensor |
| POST | `/sensors/{sensor_id}/assign` | Assign sensor to a field |
| POST | `/sensors/{sensor_id}/simulate` | Generate a simulated reading |

### Ingestion (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ingest/sensor` | Push raw sensor reading |
| POST | `/ingest/weather` | Push weather reading |
| POST | `/ingest/image` | Upload crop image (URL form) |
| GET | `/sensor_readings` | Recent readings for a field |
| GET | `/weather_readings` | Recent weather readings for a field |

### Recommendations & feedback (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recommend/{field_id}` | Generate hybrid LSTM + rules recommendation |
| GET | `/recommend/{field_id}/latest` | Most recent recommendation |
| GET | `/recommendations` | History list for a field |
| POST | `/feedback` | Submit feedback on a recommendation |

### Image AI (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload/image` | Upload + analyze crop photo (multipart) |
| POST | `/analyze/image` | Re-analyze an existing image |
| DELETE | `/images/{image_id}` | Delete an image |

### Chat (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/dashboard` | Cross-farm chat grounded in all fields, sensors, recs |
| POST | `/field/{field_id}/chat` | Per-field "Ask your field" chat |

All protected endpoints require `Authorization: Bearer <token>`.

## Database Schema

Tables defined in `backend/api/models.py`:

- `Farmer` — accounts, hashed passwords, email-verification state
- `Field` — geo-located fields owned by a farmer
- `SensorReading` — raw soil sensor telemetry (time-series)
- `WeatherReading` — fetched and ingested weather records
- `Image` — uploaded crop photos and analysis results
- `Recommendation` — generated recommendations with ML metadata
- `Feedback` — farmer feedback on recommendations
- `Sensor` — registered IoT devices
- `SensorAssignment` — sensor ↔ field bindings with assignment history

## AI / ML Architecture

### 1. Per-field LSTM rainfall forecasting

- **Data**: 2 years of historical weather from Open-Meteo (temperature, humidity, precipitation).
- **Model**: 3-layer bidirectional LSTM, 64 hidden units, dropout 0.2.
- **Input**: 7-day sliding window of 4 weather features.
- **Output**: 3-day rainfall (mm) forecast.
- **Training**: Triggered on field creation, 100 epochs, Adam + MSE.
- **Inference**: Combined with the live Open-Meteo forecast in `recommendation.py`. Conflicts surface as risk alerts.

Source: `backend/api/services/weather_ml.py`, `backend/api/ml/lstm.py`.

### 2. Image disease detection

A graceful fallback chain in `backend/api/ml/image_model.py`:

1. **Ollama** (`gemma4:e2b` on the host) — primary, local, no API key required.
2. **Google Gemini** — if `GEMINI_API_KEY` is set.
3. **OpenAI** vision — if `OPENAI_API_KEY` is set.
4. **Groq** vision — if `GROQ_API_KEY` is set.
5. **HuggingFace** crop-disease pipeline — fully local fallback.
6. **Keyword heuristics** — last-resort filename / notes match.

Each step returns a structured diagnosis (issue, severity, treatment, source). The first non-empty result wins.

### 3. Conversational chat

`backend/api/services/chat.py` builds a structured context block (field metadata, latest sensor reading, weather forecast, recent recommendations, sensor inventory) and sends it to Ollama with the user's question. Two flavors:

- `chat_about_farm()` — aggregates across all fields for the dashboard chat.
- `chat_about_field()` — single-field "Ask your field".

Action enums (irrigation, fertilizer) are humanized before they enter the prompt so model output stays natural.

## Authentication

1. Register at `POST /farmers` (or `POST /auth/google`).
2. `POST /login` returns a JWT valid for 30 days.
3. The frontend stores the token in `localStorage` and attaches `Authorization: Bearer <token>` on every call.
4. Forgotten passwords: `POST /auth/forgot-password` emails a code, then `POST /auth/reset-password` sets a new password.
5. Email change: `POST /farmers/{id}/email/request-change` sends a verification code; `.../verify-change` finalizes.
6. Google Sign-In verifies the ID token server-side and creates or returns the matching account.

## Frontend Pages

| Route | Page |
|-------|------|
| `/` | Login |
| `/register` | Register |
| `/forgot-password` | ForgotPassword |
| `/dashboard` | Dashboard (with cross-field chat) |
| `/profile` | Profile |
| `/fields` | FieldsList |
| `/fields/new` | CreateField |
| `/field/:fieldId` | FieldDetail (with "Ask your field" chat) |
| `/field/:fieldId/recommend` | RecommendationResult |
| `/field/:fieldId/history` | RecommendationHistory |
| `/field/:fieldId/feedback/:recommendationId` | Feedback |
| `/sensors` | SensorRegistry |
| `/sensors/new` | AddSensor |
| `/sensors/:id` | SensorDetail |
| `*` | NotFound |

## Internationalization

Translations live under `frontend/nomad-fields/RootSphere-Frontend/src/locales/` and are wired through `react-i18next`. Supported languages: `en`, `hi`, `te`, `ta`. The bridge in `src/contexts/LanguageContext.tsx` lets older components use `useLanguage()` while new code can call `useTranslation()` directly.

## Project Structure

```
RootSphere/
├── backend/
│   ├── api/
│   │   ├── main.py                  # FastAPI app, all routes
│   │   ├── models.py                # SQLAlchemy ORM tables
│   │   ├── schemas.py               # Pydantic schemas
│   │   ├── crud.py                  # DB operations
│   │   ├── recommendation.py        # Hybrid recommendation engine
│   │   ├── crop_nutrient_standards.py
│   │   ├── db.py
│   │   ├── services/
│   │   │   ├── auth.py              # JWT + Argon2
│   │   │   ├── chat.py              # Ollama-backed chat (farm + field)
│   │   │   ├── email.py             # Resend transactional email
│   │   │   ├── weather.py           # Open-Meteo client
│   │   │   └── weather_ml.py        # LSTM training & inference
│   │   └── ml/
│   │       ├── lstm.py              # Bi-LSTM model
│   │       ├── model.py
│   │       ├── image_model.py       # Multimodal image AI fallback chain
│   │       ├── soil_classifier.joblib
│   │       └── models/              # Per-field saved weights
│   ├── migrations/                  # Alembic
│   ├── tools/                       # Simulation scripts
│   ├── tests/                       # pytest suite
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   └── nomad-fields/RootSphere-Frontend/
│       ├── src/
│       │   ├── pages/               # 15 route pages
│       │   ├── components/          # shadcn/ui + app components
│       │   ├── contexts/            # i18n bridge
│       │   ├── lib/                 # API client, storage
│       │   ├── locales/             # en / hi / te / ta JSON
│       │   └── types/
│       ├── Dockerfile
│       └── package.json
├── specs/                           # Feature specs (e.g. C10 alerts)
├── docker-compose.yml
├── render.yaml                      # Render.com deployment manifest
└── README.md
```

## Testing

```bash
# Backend
docker compose exec api pytest -v

# Frontend (type + build check)
cd frontend/nomad-fields/RootSphere-Frontend && npm run build
```

Backend tests live in `backend/tests/test_api.py` and cover the public auth and field flows.

## Deployment

`render.yaml` defines a Render.com blueprint with a managed Postgres database and a Docker-based API service (Singapore region). `SECRET_KEY` is generated by Render. Deploy via:

```bash
# Connect the repo on Render and select "Blueprint" — render.yaml does the rest.
```

The frontend is a static Vite build and can be hosted anywhere (Render static site, Netlify, Vercel, Cloudflare Pages). Set `VITE_API_BASE_URL` to the deployed API URL.

## Sustainable Development Goals

This project supports **UN SDG 2: Zero Hunger** (Target 2.4 — Sustainable Food Production) by optimizing water and fertilizer usage through data-driven recommendations, and **SDG 12: Responsible Consumption** by reducing agricultural resource waste.
