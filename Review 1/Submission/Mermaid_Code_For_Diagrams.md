# Mermaid Code for Project Diagrams

Since the automatic image generation is currently limited, please use the following **Mermaid JS** code to generate your diagrams. You can copy-paste these into [Mermaid Live Editor](https://mermaid.live/) or use a VS Code extension to export them as High-Resolution PNGs.

## 1. Use Case Diagram
*Matches internal BackgroundTask logic.*

```mermaid
usecaseDiagram
    actor Farmer
    actor "IoT Sensor" as Sensor
    actor "Weather Service" as Weather
    
    package "Smart Crop System" {
        usecase "Login / Register" as UC1
        usecase "Manage Fields" as UC2
        usecase "View Recommendations" as UC3
        usecase "Upload Crop Images" as UC4
        usecase "Ingest Sensor Data" as UC5
        usecase "Fetch Forecast" as UC6
    }

    Farmer --> UC1
    Farmer --> UC2
    Farmer --> UC3
    Farmer --> UC4
    Sensor --> UC5
    Weather --> UC6
    UC3 ..> UC6 : <<include>>
    UC3 ..> UC5 : <<include>>
```

## 2. Class Diagram
*Matches `models.py` and `schemas.py`.*

```mermaid
classDiagram
    class Field {
        +UUID id
        +String name
        +Float lat
        +Float lon
        +get_latest_snapshot()
    }
    class SensorReading {
        +Float n
        +Float p
        +Float k
        +Float moisture
        +DateTime ts
    }
    class RecommendationEngine {
        +generate(snapshot)
    }
    class WeatherService {
        +fetch_live(lat, lon)
    }

    Field "1" *-- "many" SensorReading
    RecommendationEngine ..> Field : analyzes
    RecommendationEngine ..> WeatherService : uses
```

## 3. Sequence Diagram (Recommendation Flow)
*Correctly shows 202 Accepted and Internal Worker.*

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant Worker as Internal Worker

    User->>Frontend: Click "Get Advice"
    Frontend->>API: POST /recommend/{field_id}
    
    API->>DB: Fetch Snapshot
    DB-->>API: Return Data
    
    API->>Worker: Trigger Background Task
    API-->>Frontend: Returns 202 Accepted
    
    activate Worker
    Worker->>Worker: Inference (LSTM + Rules)
    Worker->>DB: Save Recommendation
    deactivate Worker
    
    Frontend->>API: Poll /recommendations (Optional)
    API-->>Frontend: Return JSON
    Frontend-->>User: Display Advice
```

## 4. Component Diagram
*Removes external Redis/S3 to match Prototype.*

```mermaid
graph TD
    subgraph Client
        UI[Frontend (React)]
    end
    
    subgraph "Backend Container"
        API[FastAPI Service]
        Auth[Auth Module]
        Ingest[Ingestion Module]
        Worker[Internal Worker Board]
    end
    
    subgraph Storage
        DB[(PostgreSQL)]
        Vol[(Local Disk /static)]
    end
    
    Ext[External Weather API]

    UI -->|JSON| API
    API --> Auth
    API --> Ingest
    API -->|Async Trigger| Worker
    
    API -->|SQL| DB
    Worker -->|SQL| DB
    
    API -->|Save| Vol
    Worker -->|Read| Vol
    API -->|HTTP| Ext
```

## 5. DFD (Level 1)
*Shows Data Flow without external queues.*

```mermaid
flowchart TD
    Farmer[Farmer] -->|1. Login/Request| API[API Gateway]
    Sensor[IoT Sensor] -->|2. Payload| API
    
    API -->|3. Store Data| DB[(Database)]
    API -->|4. Trigger| Worker((Internal Worker))
    
    Worker -->|5. Process ML| DB
    Worker -->|6. Save Image| Disk[(Local Storage)]
    
    API -->|7. Fetch Result| DB
    API -->|8. Response| Farmer
```
