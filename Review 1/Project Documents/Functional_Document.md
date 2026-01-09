# Functional Document
**Project:** Smart Multi-Modal Soil & Crop Health Prediction System
**Review:** First Review

## 1. Introduction
This document outlines the functional modules of the system, detailing their purpose, inputs, and outputs. The system serves as an intelligent assistant for farmers, leveraging multi-modal data to provide precision agriculture insights.

## 2. Module Descriptions

### 2.1 User Authentication Module
**Purpose:** Securely manages user access and profile information.
-   **Features:**
    -   **Farmer Registration:** Allows new users to sign up with name, phone, email, and password. Checks for duplicate emails.
    -   **Login:** Authenticates users using Email/Password and issues a JWT (JSON Web Token) for session management.
    -   **Password Management:** "Forgot Password" flow with simulated email verification codes and "Reset Password" functionality.
-   **Inputs:** Registration Form (Name, Email, Password), Login Credentials.
-   **Outputs:** Access Token (Bearer), User Profile.

### 2.2 Field Management Module
**Purpose:** Allows farmers to organize their land holdings and track specific crop batches.
-   **Features:**
    -   **Create Field:** Defined by Name, Crop Type (e.g., Wheat, Rice), Growth Stage (e.g., Vegetative, Flowering), and Location (Lat/Lon). Includes automatic weather data pre-fetching upon creation.
    -   **List Fields:** Dashboard view of all configured fields.
    -   **Update Field:** Modify crop details or growth status as the season progresses.
-   **Inputs:** Field Name, Crop Details, GPS Coordinates.
-   **Outputs:** Field ID, Dashboard Cards, Initial Weather Data.

### 2.3 Data Ingestion Module (Multi-Modal)
**Purpose:** Aggregates data from diverse sources to build a comprehensive view of field health.
-   **Sub-Modules:**
    -   **Sensor Ingestion:** Accepts telemetry from IoT devices measuring Soil Moisture, pH, and Nutrients (N, P, K).
    -   **Weather Ingestion:** Real-time integration with Open-Meteo API to fetch Temperature, Humidity, and Rainfall. Supports forecast fetching (up to 72 hours).
    -   **Image Ingestion:** Uploads crop images (Drone/Phone) to analyze visual health indicators.
-   **Inputs:** IoT JSON payloads, Open-Meteo API responses, Image Files (JPG/PNG).
-   **Outputs:** Time-stamped database records (SensorReadings, WeatherReadings, Images).

### 2.4 Intelligence & Recommendation Module
**Purpose:** The core "brain" of the system that processes data into actionable advice.
-   **Features:**
    -   **Snapshot Generation:** Aggregates the latest valid data point from all three sources (Sensor, Weather, Image) into a single "State Object".
    -   **Hybrid Analysis:**
        *   **LSTM Model:** Predicts short-term rainfall risks based on 7-day weather history.
        *   **Rule Engine:** Compares soil moisture against crop-specific thresholds (e.g., "If < 30% and no rain forecast -> Irrigate").
    -   **Alert Mechanism:** Flags discrepancies between API forecasts and AI predictions (Risk Alerts).
-   **Inputs:** Field ID, Historical Data.
-   **Outputs:**
    *   **Irrigation Advice:** Volume (Liters/Acre) and Timing.
    *   **Fertilizer Advice:** Specific N-P-K adjustments (kg/Acre).
    *   **Why-Analysis:** Textual explanation of the reasoning (e.g., "Soil moisture low and high heat expected").

### 2.5 Visualization Module (Frontend)
**Purpose:** Presents complex data in an accessible format for farmers.
-   **Features:**
    -   **Field Detail Dashboard:** Unified view of current status.
    -   **Charts:** Historical trends for Soil Moisture and Rainfall (using Recharts).
    -   **Image Gallery:** Timeline view of uploaded crop images.
    -   **Recommendation Cards:** Clear, actionable cards showing "Irrigate" or "Fertilize" tasks.

## 3. User Roles
-   **Farmer:** End-user with access to all management and recommendation features.
-   **Admin (System):** Internal role for system configuration and sensor assignment (handled via API/Script).
