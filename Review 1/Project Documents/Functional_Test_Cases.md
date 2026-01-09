# Functional Test Case Document
**Project:** Smart Multi-Modal Soil & Crop Health Prediction System
**Review:** First Review

## Test Strategy
Testing focuses on verifying the core user flows (End-to-End) and the accuracy of the data processing pipeline.

## Test Cases

| Test ID | Module | Test Scenario | Pre-Conditions | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC01** | Auth | Farmer Registration | Database is running. | 1. Navigate to Registration Page.<br>2. Enter Name, valid Email, Password.<br>3. Click "Register". | User is created, token is returned, and dashboard loads. | Pass |
| **TC02** | Auth | Duplicate Email Check | User "test@example.com" exists. | 1. Attempt to register with "test@example.com". | Error message: "Email already registered". | Pass |
| **TC03** | Field | Create New Field | User logged in. | 1. Click "Add Field".<br>2. Enter Name "Wheat Field A", Crop "Wheat", Location (Lat/Lon).<br>3. Submit. | Field appears in list. Weather data for location is auto-fetched. | Pass |
| **TC04** | Field | Update Field Details | Field exists. | 1. Open Field Details.<br>2. Change Crop Stage to "Flowering".<br>3. Save. | Update reflects immediately on dashboard. | Pass |
| **TC05** | Ingest | Sensor Data Ingestion | Backend API running. | 1. Send `POST /ingest/sensor` with valid JSON payload (N,P,K, moisture). | API returns 200 OK. Data visible in "Latest Snapshot". | Pass |
| **TC06** | Ingest | Image Upload | Field exists. | 1. Click "Upload Image".<br>2. Select JPG file.<br>3. Confirm upload. | Image added to gallery. Timestamp recorded correctly. | Pass |
| **TC07** | Analysis | Generate Recommendation | Field has Sensor & Weather data. | 1. Click "Get Recommendation".<br>2. Wait for analysis. | System displays "Irrigation Advice" and "Fertilizer Advice" cards with specific values. | Pass |
| **TC08** | Analysis | Risk Alert Logic | AI Forecast differs from API. | 1. Mock API implementation to show divergent weather.<br>2. Request Recommendation. | "Risk Alert" badge appears on the weather card. | Pass |
| **TC09** | Cloud | Weather API Fallback | Internet disconnected. | 1. Trigger weather fetch without network. | System handles error gracefully (logs error), shows last known data if available. | Pass |
| **TC10** | UI | Responsive Layout | Mobile Browser. | 1. Load Dashboard on 375px width (Mobile). | Layout stacks vertically; no horizontal scroll. | Pass |
