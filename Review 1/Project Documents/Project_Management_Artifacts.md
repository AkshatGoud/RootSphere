# Project Management Artifacts
**Project:** Smart Multi-Modal Soil & Crop Health Prediction System
**Platform:** MS Planner / OneNote (Simulated)

---

## 1. Product Backlog (Epics & User Stories)

### Epic 1: Project Setup & Infrastructure
*   **US-101:** As a developer, I want to set up the FastAPI backend structure so that I can create API endpoints. (Priority: High, Status: Done)
*   **US-102:** As a developer, I want to configure PostgreSQL with Docker so that data persists across restarts. (Priority: High, Status: Done)

### Epic 2: Data Ingestion (Sensors & Weather)
*   **US-201:** As a farmer, I want my field's weather data (Temp, Rain) to be updated automatically using my GPS location. (Priority: Critical, Status: Done)
*   **US-202:** As a system, I want to ingest valid JSON payloads from soil sensors (NPK, pH) to track soil health. (Priority: High, Status: Done)

### Epic 3: User Interface (Frontend)
*   **US-301:** As a farmer, I want a dashboard where I can see all my fields at a glance. (Priority: Medium, Status: Done)
*   **US-302:** As a farmer, I want to upload images of my crops to store a visual history of growth. (Priority: Medium, Status: Done)

### Epic 4: Intelligent Analysis (AI/ML)
*   **US-401:** As a user, I want to receive recommendations for irrigation based on soil moisture and upcoming rain forecasts. (Priority: High, Status: Prototype Ready)
*   **US-402:** As a researcher, I want the system to flag when the AI prediction differs significantly from the standard weather forecast. (Priority: Low, Status: In Progress)

---

## 2. Daily Scrum Log (Standup Updates)
*Format: Date | Tasks Completed (Yesterday) | Tasks Planned (Today) | Blockers*

**Date: 01-Jan-2026**
*   **Completed:** Initialized Git repo, set up `main.py` basic endpoints.
*   **Planned:** Create Database models (`models.py`) and Alembic migrations.
*   **Blockers:** None.

**Date: 02-Jan-2026**
*   **Completed:** Database connection successful. Created `Farmer` and `Field` schemas.
*   **Planned:** Integrate Open-Meteo API for live weather fetching.
*   **Blockers:** API Rate limiting? (Need to check Open-Meteo free tier limits).

**Date: 03-Jan-2026**
*   **Completed:** Weather fetching works. Added `weather_service.py`.
*   **Planned:** comprehensive Logic for "Hybrid Recommendation". Coding the Rule engine.
*   **Blockers:** None.

**Date: 04-Jan-2026**
*   **Completed:** Hybrid Logic implemented. Added API vs AI risk alert.
*   **Planned:** Frontend integration. Build `FieldDetail` page in React.
*   **Blockers:** Node.js version mismatch on local machine (Solved).
