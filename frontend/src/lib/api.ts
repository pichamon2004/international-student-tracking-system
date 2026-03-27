import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
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
  staffComment: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: number; studentId: string | null;
    firstNameEn: string | null; lastNameEn: string | null; middleNameEn: string | null;
    titleEn: string | null; email: string | null; phone: string | null;
    program: string | null; faculty: string | null; level: string | null;
    nationality: string | null; homeCountry: string | null;
  };
  requestType?: {
    id: number;
    name: string;
    icon: string | null;
    documentTemplates?: { id: number; name: string; description: string | null; variables: string | null; body: string }[];
  };
  attachments?: string | null;  // JSON array of file URLs
  advisorComment?: string | null;
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

  updateStatus: (id: number, status: string, comment?: string, files?: File[]) => {
    if (files && files.length > 0) {
      const form = new FormData();
      form.append('status', status);
      if (comment) form.append('comment', comment);
      files.forEach(f => form.append('files', f));
      return api.put<{ success: boolean; data: ApiRequest }>(`/requests/${id}/status`, form, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.put<{ success: boolean; data: ApiRequest }>(`/requests/${id}/status`, { status, comment });
  },
};

// ── Students ───────────────────────────────────────────────────

export interface ApiStudent {
  id: number;
  studentId: string | null;

  // Names
  titleEn: string | null;
  firstNameEn: string | null;
  middleNameEn: string | null;
  lastNameEn: string | null;

  // Personal
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  religion: string | null;
  homeCountry: string | null;

  // Contact & address
  email: string | null;
  phone: string | null;
  addressInThailand: string | null;
  homeAddress: string | null;

  // Emergency contact
  emergencyContact: string | null;
  emergencyEmail: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;

  // Academic (staff-filled at Phase 2 completion)
  faculty: string | null;
  program: string | null;
  level: string | null;
  enrollmentDate: string | null;
  expectedGraduation: string | null;
  scholarship: string | null;
  advisorId: number | null;

  photoUrl: string | null;
  registrationStatus: string;
  registrationStep: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStudentDetail extends ApiStudent {
  passports: ApiPassport[];
  visas: ApiVisa[];
  healthInsurances: ApiHealthInsurance[];
  advisor: { id: number; titleEn: string | null; firstNameEn: string | null; lastNameEn: string | null; faculty: string | null } | null;
}

export interface ApiStudentWithExpiry extends ApiStudent {
  passports?: { passportNumber: string; expiryDate: string }[];
  visas?: { visaType: string; expiryDate: string }[];
  healthInsurances?: { provider: string; expiryDate: string }[];
  advisor?: { titleEn: string | null; firstNameEn: string | null; lastNameEn: string | null } | null;
}

export const studentApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: ApiStudentWithExpiry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>('/students', { params }),

  getById: (id: number) =>
    api.get<{ success: boolean; data: ApiStudentDetail }>(`/students/${id}`),

  update: (id: number, data: Partial<ApiStudent & { registrationStatus: string; registrationStep: number }>) =>
    api.put<{ success: boolean; data: ApiStudent }>(`/students/${id}`, data),

  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/students/${id}`),

  create: (data: { email: string; studentId?: string; titleEn?: string; firstNameEn: string; middleNameEn?: string; lastNameEn: string }) =>
    api.post<{ success: boolean; data: ApiStudent }>('/students', data),

  approve: (id: number) => api.put<{ success: boolean; data: ApiStudent }>(`/students/${id}/approve`),

  reject: (id: number, reason: string) => api.put<{ success: boolean }>(`/students/${id}/reject`, { rejectionReason: reason }),

  registerPhase1: (data: Partial<ApiStudent>) =>
    api.post<{ success: boolean; data: ApiStudent }>('/students/register', data),

  submitPhase2: () =>
    api.put<{ success: boolean; data: ApiStudent }>('/students/me/submit-phase2'),

  sendEmail: (studentId: number, templateId: number) =>
    api.post<{ success: boolean; message: string }>(`/students/${studentId}/send-email`, { templateId }),
};

// ── Notifications API ──────────────────────────────────────────

export interface ApiNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export const notificationApi = {
  getAll: (params?: { isRead?: boolean }) =>
    api.get<{ success: boolean; data: ApiNotification[] }>('/notifications', { params }),
  getUnreadCount: () =>
    api.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count'),
  markAsRead: (id: number) =>
    api.put<{ success: boolean }>(`/notifications/${id}/read`),
  markAllAsRead: () =>
    api.put<{ success: boolean }>('/notifications/read-all'),
};

// ── Visa Renewals API ──────────────────────────────────────────

export interface ApiVisaRenewal {
  id: number;
  studentId: number;
  daysRemaining: number;
  notifiedAt: string;
  isResolved: boolean;
  resolvedAt: string | null;
  student?: {
    id: number;
    firstNameEn: string | null;
    lastNameEn: string | null;
    studentId: string | null;
    nationality: string | null;
    homeCountry: string | null;
    visas?: { visaType: string; expiryDate: string }[];
  };
}

export const visaRenewalApi = {
  getAll: (params?: { isResolved?: boolean }) =>
    api.get<{ success: boolean; data: ApiVisaRenewal[] }>('/visa-renewals', { params }),
  resolve: (id: number) =>
    api.put<{ success: boolean }>(`/visa-renewals/${id}/resolve`),
};

// ── Academic Document API ──────────────────────────────────────

export interface ApiAcademicDocument {
  id: number;
  studentId: number;
  docType: string;
  institution: string;
  issueDate: string;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const academicDocumentApi = {
  getAll: (studentId: number) =>
    api.get<{ success: boolean; data: ApiAcademicDocument[] }>(`/students/${studentId}/academic-documents`),
  create: (studentId: number, data: { docType: string; institution: string; issueDate: string; fileUrl?: string }) =>
    api.post<{ success: boolean; data: ApiAcademicDocument }>(`/students/${studentId}/academic-documents`, data),
  update: (studentId: number, docId: number, data: Partial<Omit<ApiAcademicDocument, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ success: boolean; data: ApiAcademicDocument }>(`/students/${studentId}/academic-documents/${docId}`, data),
  delete: (studentId: number, docId: number) =>
    api.delete<{ success: boolean }>(`/students/${studentId}/academic-documents/${docId}`),
};

// ── Email Template API ─────────────────────────────────────────

export interface ApiEmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  variables: string | null;  // JSON string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const emailTemplateApi = {
  getAll: () =>
    api.get<{ success: boolean; data: ApiEmailTemplate[] }>('/email-templates'),
  create: (data: { name: string; subject: string; body: string; variables?: string[]; isActive?: boolean }) =>
    api.post<{ success: boolean; data: ApiEmailTemplate }>('/email-templates', data),
  update: (id: number, data: Partial<{ name: string; subject: string; body: string; variables: string[]; isActive: boolean }>) =>
    api.put<{ success: boolean; data: ApiEmailTemplate }>(`/email-templates/${id}`, data),
  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/email-templates/${id}`),
};

// ── Student "me" API ───────────────────────────────────────────

export interface ApiPassport {
  id: number;
  studentId: number;
  passportNumber: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue: string | null;
  mrzLine1: string | null;
  mrzLine2: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiVisa {
  id: number;
  studentId: number;
  visaNumber: string | null;
  visaType: string;
  status: string;
  issuingCountry: string;
  issuingPlace: string | null;
  issueDate: string;
  expiryDate: string;
  entries: string | null;
  remarks: string | null;
  imageUrl: string | null;
  arrivalImageUrl: string | null;
  departedImageUrl: string | null;
  passportImageUrl: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHealthInsurance {
  id: number;
  studentId: number;
  provider: string;
  policyNumber: string | null;
  coverageType: string | null;
  startDate: string;
  expiryDate: string;
  fileUrl: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDependent {
  id: number;
  studentId: number;
  relationship: string;
  title: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string | null;
  passportExpiry: string | null;
  passportImageUrl: string | null;
  visaType: string | null;
  visaExpiry: string | null;
  visaImageUrl: string | null;
  arrivalImageUrl: string | null;
  departedImageUrl: string | null;
  visaStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAdvisor {
  id: number;
  userId: number;
  titleEn: string | null;
  firstNameEn: string | null;
  lastNameEn: string | null;
  faculty: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  nationality: string | null;
  isDean: boolean;
  isActive: boolean;
  workPermitNumber: string | null;
  workPermitIssue: string | null;
  workPermitExpiry: string | null;
  students?: Array<{
    id: number;
    studentId: string | null;
    titleEn: string | null;
    firstNameEn: string | null;
    lastNameEn: string | null;
    faculty: string | null;
    program: string | null;
    level: string | null;
    registrationStatus: string;
    homeCountry: string | null;
    visas?: { visaType: string; expiryDate: string }[];
    passports?: { expiryDate: string }[];
  }>;
}

export interface ApiStudentMe extends ApiStudent {
  passports: ApiPassport[];
  visas: ApiVisa[];
  healthInsurances: ApiHealthInsurance[];
  academicDocuments: ApiAcademicDocument[];
  advisor: { id: number; titleEn: string | null; firstNameEn: string | null; lastNameEn: string | null; faculty: string | null; phone: string | null; email: string | null } | null;
  staffContact: { name: string; phone: string | null; email: string } | null;
}

export const studentMeApi = {
  get: () => api.get<{ success: boolean; data: ApiStudentMe }>('/students/me'),
};

// ── Passport API ───────────────────────────────────────────────

export const passportApi = {
  get: (studentId: number) =>
    api.get<{ success: boolean; data: ApiPassport }>(`/students/${studentId}/passport`),
  upsert: (studentId: number, data: {
    passportNumber: string; issuingCountry: string; issueDate: string; expiryDate: string;
    placeOfIssue?: string; imageUrl?: string; isCurrent?: boolean;
  }) => api.put<{ success: boolean; data: ApiPassport }>(`/students/${studentId}/passport`, data),
};

// ── Visa API ───────────────────────────────────────────────────

export const visaApi = {
  getAll: (studentId: number) =>
    api.get<{ success: boolean; data: ApiVisa[] }>(`/students/${studentId}/visas`),
  create: (studentId: number, data: {
    visaType: string; issuingCountry: string; issueDate: string; expiryDate: string;
    visaNumber?: string; issuingPlace?: string; entries?: string; remarks?: string; status?: string;
  }) => api.post<{ success: boolean; data: ApiVisa }>(`/students/${studentId}/visas`, data),
  update: (studentId: number, visaId: number, data: Partial<Omit<ApiVisa, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ success: boolean; data: ApiVisa }>(`/students/${studentId}/visas/${visaId}`, data),
  delete: (studentId: number, visaId: number) =>
    api.delete<{ success: boolean }>(`/students/${studentId}/visas/${visaId}`),
};

// ── Health Insurance API ───────────────────────────────────────

export const healthInsuranceApi = {
  getAll: (studentId: number) =>
    api.get<{ success: boolean; data: ApiHealthInsurance[] }>(`/students/${studentId}/health-insurance`),
  create: (studentId: number, data: {
    provider: string; startDate: string; expiryDate: string;
    policyNumber?: string; coverageType?: string; fileUrl?: string;
  }) => api.post<{ success: boolean; data: ApiHealthInsurance }>(`/students/${studentId}/health-insurance`, data),
  update: (studentId: number, insuranceId: number, data: Partial<Omit<ApiHealthInsurance, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ success: boolean; data: ApiHealthInsurance }>(`/students/${studentId}/health-insurance/${insuranceId}`, data),
  delete: (studentId: number, insuranceId: number) =>
    api.delete<{ success: boolean }>(`/students/${studentId}/health-insurance/${insuranceId}`),
};

// ── Dependent API ──────────────────────────────────────────────

export const dependentApi = {
  getAll: (studentId: number) =>
    api.get<{ success: boolean; data: ApiDependent[] }>(`/students/${studentId}/dependents`),
  create: (studentId: number, data: {
    relationship: string; firstName: string; lastName: string; dateOfBirth: string; gender: string; nationality: string;
    title?: string; middleName?: string; passportNumber?: string; passportExpiry?: string;
    passportImageUrl?: string; visaType?: string; visaExpiry?: string; visaImageUrl?: string; visaStatus?: string;
  }) => api.post<{ success: boolean; data: ApiDependent }>(`/students/${studentId}/dependents`, data),
  update: (studentId: number, depId: number, data: Partial<Omit<ApiDependent, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ success: boolean; data: ApiDependent }>(`/students/${studentId}/dependents/${depId}`, data),
  delete: (studentId: number, depId: number) =>
    api.delete<{ success: boolean }>(`/students/${studentId}/dependents/${depId}`),
};

// ── Advisor API ────────────────────────────────────────────────

export const advisorApi = {
  create: (data: { email: string; titleEn?: string; firstNameEn: string; lastNameEn: string; middleNameEn?: string; phone?: string; nationality?: string; faculty?: string }) =>
    api.post<{ success: boolean; data: ApiAdvisor }>('/advisors', data),
  getMe: () =>
    api.get<{ success: boolean; data: ApiAdvisor }>('/advisors/me'),
  getAll: () =>
    api.get<{ success: boolean; data: ApiAdvisor[] }>('/advisors'),
  getById: (id: number) =>
    api.get<{ success: boolean; data: ApiAdvisor }>(`/advisors/${id}`),
  update: (data: Partial<Pick<ApiAdvisor, 'titleEn' | 'firstNameEn' | 'lastNameEn' | 'phone' | 'workPermitNumber' | 'workPermitIssue' | 'workPermitExpiry'> & { nationality?: string }>) =>
    api.put<{ success: boolean; data: ApiAdvisor }>('/advisors/me', data),
  updateById: (id: number, data: Partial<Pick<ApiAdvisor, 'titleEn' | 'firstNameEn' | 'lastNameEn' | 'phone' | 'faculty' | 'position' | 'workPermitNumber' | 'workPermitIssue' | 'workPermitExpiry'>>) =>
    api.put<{ success: boolean; data: ApiAdvisor }>(`/advisors/${id}`, data),
  getDean: () =>
    api.get<{ success: boolean; data: { id: number; titleEn: string | null; firstNameEn: string; lastNameEn: string } | null }>('/advisors/dean'),
  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post<{ success: boolean; data: { url: string } }>('/advisors/me/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const userApi = {
  getIRStaff: () =>
    api.get<{ success: boolean; data: { id: number; name: string } | null }>('/users/ir-staff'),
};

export default api;
