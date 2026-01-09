# RootSphere AI: Smart Multi-Modal Soil & Crop Health Prediction System

RootSphere AI is an advanced precision agriculture platform that synthesizes IoT soil data, hyper-local weather forecasts, and computer vision to provide actionable farming insights.

## 🚀 Features
- **Real-time Monitoring**: Live dashboards for Soil NPK, pH, Moisture, and Weather.
- **Hybrid Intelligence**: Combines rule-based agronomy with LSTM weather models for crop recommendations.
- **Disease & Pest Detection**: Computer vision analysis of crop images.
- **Field Management**: Geo-tagged profiles for multiple land plots.
- **Sustainability**: Aligned with UN SDG 2 (Zero Hunger) and SDG 12 (Responsible Consumption).

## 🛠️ Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts.
- **Backend**: FastAPI (Python), SQLAlchemy, Pydantic, Alembic.
- **Database**: PostgreSQL 15.
- **ML/AI**: PyTorch (LSTM), Scikit-Learn, Open-Meteo API.
- **Infrastructure**: Docker, Docker Compose.
- **IoT Support**: Compatible with ESP32 / Nano Banana Pro.

## 📋 Prerequisites
- **Docker** & **Docker Compose** installed on your machine.
- **Python 3.11+** (Only if running locally without Docker).

## ⚡ Quick Start (Docker)

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd "Major project"
   ```

2. **Start the System**
   This command builds the backend and frontend images and starts the containers.
   ```bash
   docker compose up --build -d
   ```

3. **Initialize Database**
   Apply migrations to set up the database schema.
   ```bash
   docker compose exec api alembic upgrade head
   ```

4. **Access the Application**
   - **Frontend Dashboard**: [http://localhost:8080](http://localhost:8080)
   - **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Database Health**: [http://localhost:8000/health](http://localhost:8000/health)

5. **(Optional) Run Data Simulator**
   Generate dummy data for fields and sensors to visualize the dashboard.
   ```bash
   docker compose exec api python tools/simulate_field.py
   ```

## 🧪 Testing
Run the backend test suite inside the container:
```bash
docker compose exec api pytest -v
```

## 🔌 Core API Endpoints

### **Authentication**
- `POST /login`: Authenticate farmer.
- `POST /farmers`: Register new account.

### **Field & Data**
- `GET /field/{field_id}/latest`: Get unified dashboard snapshot.
- `POST /ingest/sensor`: Push IoT sensor data.
- `POST /ingest/weather`: Push/Cache weather data.

### **Intelligence**
- `POST /recommend/{field_id}`: Trigger crop recommendation engine.
- `POST /ingest/image`: Upload image for disease analysis.

## 📂 Project Structure
```
├── backend/            # FastAPI Application
│   ├── api/            # Routes, Models, Services
│   ├── migrations/     # Database versions (Alembic)
│   └── tools/          # Simulation scripts
├── frontend/           # React Application
│   └── nomad-fields/   # Vite Project Source
├── docker-compose.yml  # Orchestration Config
└── README.md           # This Documentation
```

## 🌍 Sustainable Development Goals (SDG)
This project primarily supports **SDG 2: Zero Hunger** (Target 2.4 - Sustainable Food Production) by optimizing resource usage and reducing crop loss through early warnings.
