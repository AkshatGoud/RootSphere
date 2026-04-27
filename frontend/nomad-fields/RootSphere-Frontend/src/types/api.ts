// Auth & Farmer
export interface Farmer {
  id: string;
  name: string;
  phone: string;
  language: string;
}

export interface FarmerUpdate {
  name?: string;
  phone?: string;
  language?: string;
}

export interface CreateFarmerRequest {
  name: string;
  phone: string;
  email: string;
  password: string;
  language?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  farmer_id: string;
  farmer_name: string;
}

// Field types
export interface Field {
  id: string;
  farmer_id: string;
  name: string;
  crop: string;
  growth_stage: string;
  lat: number;
  lon: number;
}

export interface CreateFieldRequest {
  farmer_id: string;
  name: string;
  crop: string;
  growth_stage: string;
  lat: number;
  lon: number;
}

export interface FieldUpdate {
  name?: string;
  crop?: string;
  growth_stage?: string;
  lat?: number;
  lon?: number;
}

// Sensor data
export interface SensorReadingCreate {
  field_id: string;
  ts: string;
  moisture: number;
  ph: number;
  n: number;
  p: number;
  k: number;
}

export interface SensorSummary {
  ts: string;
  moisture: number;
  ph: number;
  n: number;
  p: number;
  k: number;
}

// Weather data
export interface WeatherPoint {
  ts: string;
  temp_c: number;
  humidity_pct: number;
  rainfall_mm: number;
}

export interface WeatherSummary {
  ts: string;
  temp_c: number;
  humidity_pct: number;
  rainfall_mm_24h: number;
  forecast_72h: WeatherPoint[];
}

export interface ImageSummary {
  id: string;
  ts: string;
  source: string;
  rgb_url: string;
  notes?: string;
}

// Field Snapshot
export interface FieldSnapshot {
  field_id: string;
  farmer_id: string;
  crop: string;
  growth_stage: string;
  location: {
    lat: number;
    lon: number;
  };
  snapshot_ts: string;
  sensor_readings?: SensorSummary;
  weather?: WeatherSummary;
  images: ImageSummary[];
  missing_data: string[];
  field_name?: string; // Derived or fetched separately? Backend snapshot doesn't have field_name. API fetch likely joins it or we have to.
  // Actually Pydantic FieldSnapshotV1 has field_id but NOT name.
  // The frontend might need to fetch field details separately or we rely on ID.
  // Wait, FieldDetail page displays name. `snapshot.field_name` usage. 
  // We should verify if backend sends name. 
  // Checked: FieldSnapshotV1 in schemas.py DOES NOT have field_name.
  // Current frontend assumes it does. This will break Title.
  // We will fix FieldDetail to use stored name or fetch field.
}

// Sensor Management
export interface Sensor {
  id: string;
  farmer_id?: string;
  name: string;
  type: string;
  metrics: string;
  status: 'draft' | 'active' | 'inactive';
  notes?: string;
  created_at: string;
  current_assignment?: SensorAssignment;
}

export interface SensorCreate {
  name: string;
  type: string;
  metrics: string;
  status?: string;
  notes?: string;
}

export interface SensorAssignment {
  id: string;
  sensor_id: string;
  field_id: string;
  field_name?: string;
  active: boolean;
  started_at: string;
  ended_at?: string;
  notes?: string;
}

export interface AssignmentCreate {
  sensor_id: string;
  field_id: string;
  notes?: string;
}

// Structured Why Item
export interface WhyItem {
  category: 'irrigation' | 'fertilizer' | 'soil' | 'image' | 'weather' | 'risk' | 'info';
  icon: string;
  severity: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  detail: string;
}

// Recommendation types
export interface IrrigationAction {
  action: string;
  liters_per_acre: number;
  timing: string;
}

export interface FertilizerAction {
  action: string;
  n_kg_acre: number;
  p_kg_acre: number;
  k_kg_acre: number;
  timing: string;
}

export interface ActionJson {
  irrigation: IrrigationAction;
  fertilizer: FertilizerAction;
}

export interface Recommendation {
  id: string;
  field_id: string;
  ts: string;
  irrigation: IrrigationAction;
  fertilizer: FertilizerAction;
  data_completeness: number;
  why: (WhyItem | string)[];
  ai_analysis?: string;
  ai_forecast?: number[];
  ai_history?: number[];
  risk_alert?: string;
  snapshot_used?: FieldSnapshot;
}

// Feedback types
export interface FeedbackRequest {
  field_id: string;
  recommendation_id: string;
  followed: boolean;
  outcome: 'improved' | 'no_change' | 'worse';
  notes?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
}
