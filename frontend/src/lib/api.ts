import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Only redirect on 401 for auth-protected routes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

// ── Document Templates ─────────────────────────────────────────

export interface ApiDocTemplate {
  id: number;
  name: string;
  description: string | null;
  body: string;
  variables: string | null;  // JSON string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const templateApi = {
  getAll: () => api.get<{ success: boolean; data: ApiDocTemplate[] }>('/templates'),

  create: (data: { name: string; description?: string; body: string; variables?: string[]; isActive?: boolean }) =>
    api.post<{ success: boolean; data: ApiDocTemplate }>('/templates', data),

  update: (id: number, data: Partial<{ name: string; description: string; body: string; variables: string[]; isActive: boolean }>) =>
    api.put<{ success: boolean; data: ApiDocTemplate }>(`/templates/${id}`, data),

  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/templates/${id}`),
};

// ── Request Types ──────────────────────────────────────────────

export interface ApiRequestType {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  documentTemplates: ApiDocTemplate[];
  createdAt: string;
  updatedAt: string;
}

export const requestTypeApi = {
  getAll: () => api.get<{ success: boolean; data: ApiRequestType[] }>('/request-types'),

  create: (data: { name: string; description?: string; icon?: string; isActive?: boolean; documentTemplateIds?: number[] }) =>
    api.post<{ success: boolean; data: ApiRequestType }>('/request-types', data),

  update: (id: number, data: Partial<{ name: string; description: string; icon: string; isActive: boolean; documentTemplateIds: number[] }>) =>
    api.put<{ success: boolean; data: ApiRequestType }>(`/request-types/${id}`, data),

  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/request-types/${id}`),
};

// ── Requests ───────────────────────────────────────────────────

export interface ApiRequest {
  id: number;
  studentId: number;
  requestTypeId: number | null;
  title: string;
  description: string | null;
  formData: string | null;  // JSON string
  status: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: number; studentId: string | null;
    firstNameEn: string | null; lastNameEn: string | null;
    titleEn: string | null; email: string | null;
    program: string | null; faculty: string | null;
  };
  requestType?: { id: number; name: string; icon: string | null };
}

export const requestApi = {
  getAll: (params?: { status?: string; studentId?: number }) =>
    api.get<{ success: boolean; data: ApiRequest[] }>('/requests', { params }),

  getById: (id: number) =>
    api.get<{ success: boolean; data: ApiRequest }>(`/requests/${id}`),

  create: (data: {
    studentId: number;
    requestTypeId?: number;
    title: string;
    description?: string;
    formData?: Record<string, string>;
  }) => api.post<{ success: boolean; data: ApiRequest }>('/requests', data),

  updateStatus: (id: number, status: string, comment?: string) =>
    api.put<{ success: boolean; data: ApiRequest }>(`/requests/${id}/status`, { status, comment }),
};

export default api;
