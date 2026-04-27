import type {
  Farmer,
  CreateFarmerRequest,
  LoginRequest,
  TokenResponse,
  Field,
  Sensor,
  SensorCreate,
  SensorAssignment,
  AssignmentCreate,
  CreateFieldRequest,
  FieldUpdate,
  FieldSnapshot,
  Recommendation,
  FeedbackRequest,
  FeedbackResponse,
  SensorSummary,
} from "@/types/api";
import { storage } from "./storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/** Resolve image URLs — prefix local uploads with the API base URL */
export function resolveImageUrl(url: string): string {
  if (url.startsWith('/uploads/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = localStorage.getItem("access_token");

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    if (response.status === 401) {
      storage.clearAll();
      // Let App.tsx handle the navigation via react-router (no full page reload).
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      throw new ApiError(401, "Session expired. Please log in again.");
    }

    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.detail) {
        errorMessage = errorJson.detail;
      }
    } catch (e) {
      // If not JSON, use the text as is
    }

    throw new ApiError(
      response.status,
      errorMessage || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

// Farmer APIs
export const authApi = {
  login: (data: LoginRequest): Promise<TokenResponse> =>
    request<TokenResponse>('/login', {
      method: "POST",
      body: JSON.stringify(data),
    }),

  googleLogin: (credential: string): Promise<TokenResponse> =>
    request<TokenResponse>('/auth/google', {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),

  forgotPassword: (email: string): Promise<{ message: string }> =>
    request<{ message: string }>('/auth/forgot-password', {
      method: "POST",
      body: JSON.stringify({ email })
    }),

  resetPassword: (data: any): Promise<{ message: string }> =>
    request<{ message: string }>('/auth/reset-password', {
      method: "POST",
      body: JSON.stringify(data)
    }),
};

export const farmersApi = {
  create: (data: CreateFarmerRequest): Promise<Farmer> =>
    request<Farmer>("/farmers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (farmerId: string): Promise<Farmer> =>
    request<Farmer>(`/farmers/${farmerId}`),

  update: (farmerId: string, data: Partial<Farmer>): Promise<Farmer> =>
    request<Farmer>(`/farmers/${farmerId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Field APIs
export const fieldsApi = {
  create: (data: CreateFieldRequest): Promise<Field> =>
    request<Field>("/fields", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (fieldId: string): Promise<Field> =>
    request<Field>(`/fields/${fieldId}`),

  /** List the authenticated farmer's fields. The backend infers the farmer from the JWT. */
  list: (): Promise<Field[]> =>
    request<Field[]>(`/fields`),

  update: (fieldId: string, data: FieldUpdate): Promise<Field> =>
    request<Field>(`/fields/${fieldId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (fieldId: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/fields/${fieldId}`, {
      method: "DELETE",
    }),
};

// Snapshot API
export const snapshotApi = {
  getLatest: (fieldId: string): Promise<FieldSnapshot> =>
    request<FieldSnapshot>(`/field/${fieldId}/latest`),

  uploadImage: (data: any): Promise<any> =>
    request<any>('/ingest/image', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  deleteImage: (imageId: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/images/${imageId}`, {
      method: 'DELETE'
    }),
};

// Recommendation APIs
export const recommendationApi = {
  /** Returns the most recent recommendation if younger than max_age_minutes,
   *  null otherwise. No ML inference triggered. */
  getLatest: (fieldId: string, maxAgeMinutes: number = 60): Promise<Recommendation | null> =>
    request<Recommendation | null>(
      `/recommend/${fieldId}/latest?max_age_minutes=${maxAgeMinutes}`
    ),

  /** Triggers a fresh ML run + persists a new row. Use sparingly. */
  generate: (fieldId: string): Promise<Recommendation> =>
    request<Recommendation>(`/recommend/${fieldId}`, {
      method: "POST",
    }),

  getHistory: async (
    fieldId: string,
    limit: number = 50
  ): Promise<Recommendation[]> => {
    const data = await request<any[]>(
      `/recommendations?field_id=${fieldId}&limit=${limit}`
    );
    // Map backend history item to Recommendation type
    return data.map((item) => ({
      id: item.id,
      field_id: item.field_id,
      ts: item.ts,
      data_completeness: item.data_completeness,
      why: item.why_json, // Backend sends why_json
      irrigation: item.action_json.irrigation,
      fertilizer: item.action_json.fertilizer,
    }));
  },
};

// Feedback API
export const feedbackApi = {
  submit: (data: FeedbackRequest): Promise<FeedbackResponse> =>
    request<FeedbackResponse>("/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Sensors
export const sensorsApi = {
  list: (): Promise<Sensor[]> => request<Sensor[]>('/sensors'),

  get: (id: string): Promise<Sensor> => request<Sensor>(`/sensors/${id}`),

  create: (data: SensorCreate): Promise<Sensor> =>
    request<Sensor>('/sensors', {
      method: "POST",
      body: JSON.stringify(data)
    }),

  assign: (id: string, data: AssignmentCreate): Promise<SensorAssignment> =>
    request<SensorAssignment>(`/sensors/${id}/assign`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  simulate: (id: string): Promise<SensorSummary> =>
    request<SensorSummary>(`/sensors/${id}/simulate`, {
      method: "POST"
    }),

  delete: (id: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/sensors/${id}`, {
      method: "DELETE",
    }),
};
