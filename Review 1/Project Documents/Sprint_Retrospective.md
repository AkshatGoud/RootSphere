# Sprint Retrospective
**Sprint:** Sprint 1 (Inception & Core Setup)
**Duration:** 2 Weeks
**Focus:** Infrastructure Setup, Data Ingestion Pipelines, Basic UI

## 1. What Went Well?
*   **Tech Stack Selection:** The choice of FastAPI (Backend) and React (Frontend) allowed for rapid prototyping.
*   **Docker Integration:** Docker Compose setup simplified the local development environment significantly.
*   **Data Integration:** Successfully connected to Open-Meteo API for real-time weather data.
*   **Model Prototype:** Initial LSTM model structure for rainfall prediction is functional.

## 2. What Didn't Go Well?
*   **Data Scarcity:** Finding a labelled dataset for "Thanjavur" specific soil conditions was difficult; had to rely on synthetic/mock data for initial training.
*   **UI Complexity:** The "3D Field Visualization" (IntentSpace logic) was harder to integrate than expected and had to be simplified for the MVP.
*   **Browser Testing:** Some CSS issues with the search bar dropdown caused delays in the frontend polish.

## 3. Action Items (for Next Sprint)
*   **AI Improvement:** Collect real-world soil samples/data to fine-tune the recommendation engine.
*   **Mobile Optimization:** Focus on improving the responsiveness of the dashboard for mobile devices.
*   **User Feedback:** Implement the "Feedback Loop" in the UI to allow farmers to rate recommendation accuracy.
*   **Testing:** Increase unit test coverage for `weather_ml.py`.
