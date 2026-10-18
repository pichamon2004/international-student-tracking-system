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
  signingMethod: 'manual' | 'digital' | 'approval';
  createdAt: string;
  updatedAt: string;
}

export const templateApi = {
  getAll: () => api.get<{ success: boolean; data: ApiDocTemplate[] }>('/templates'),

  create: (data: { name: string; description?: string; body: string; variables?: string[]; isActive?: boolean; signingMethod?: 'manual' | 'digital' | 'approval' }) =>
    api.post<{ success: boolean; data: ApiDocTemplate }>('/templates', data),

  update: (id: number, data: Partial<{ name: string; description: string; body: string; variables: string[]; isActive: boolean; signingMethod: 'manual' | 'digital' | 'approval' }>) =>
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

// One row per action on a request — submit, edit, approve/reject/forward, cancel
export interface ApiRequestEvent {
  id: number;
  requestId: number;
  type: 'SUBMITTED' | 'EDITED' | 'STATUS_CHANGED';
  actorId: number | null;
  actorRole: string | null;   // STUDENT | STAFF | ADVISOR | DEAN | VICE_DEAN
  fromStatus: string | null;
  toStatus: string | null;
  comment: string | null;
  createdAt: string;
  actor?: { id: number; name: string } | null;
}

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
    firstNameEn: string | null; lastNameEn: string | null; middleNameEn: string | null;
    titleEn: string | null; email: string | null; phone: string | null;
    program: string | null; faculty: string | null; level: string | null;
    nationality: string | null; homeCountry: string | null;
    passports?: { passportNumber: string; expiryDate: string }[];
    advisor?: {
      titleEn: string | null; firstNameEn: string | null; lastNameEn: string | null;
      phone: string | null; user?: { email: string } | null;
    } | null;
  };
  requestType?: {
    id: number;
    name: string;
    icon: string | null;
    documentTemplates?: { id: number; name: string; description: string | null; variables: string | null; body: string; signingMethod?: 'manual' | 'digital' | 'approval' }[];
  };
  attachments?: string | null;  // JSON array of file URLs (signed, short-lived)
  attachmentFileIds?: number[]; // same order as attachments — download via fileApi.download
  // Detail endpoint: full history, oldest first. List endpoint: only the latest event with a comment.
  events?: ApiRequestEvent[];
}

// ── Request event helpers ─────────────────────────────────────────

export const isCancelPending = (req: Pick<ApiRequest, 'status'>) => req.status === 'CANCEL_REQUESTED';

const newestFirst = (events: ApiRequestEvent[] = []) =>
  [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id);

// The event where the student asked to cancel (comment = their reason)
export const latestCancelRequest = (req: Pick<ApiRequest, 'events'>) =>
  newestFirst(req.events).find(e => e.toStatus === 'CANCEL_REQUESTED') ?? null;

// The latest staff decision on a cancellation, if it was rejected
export const latestCancelRejection = (req: Pick<ApiRequest, 'events'>) => {
  const decision = newestFirst(req.events).find(e => e.fromStatus === 'CANCEL_REQUESTED');
  return decision && decision.toStatus !== 'CANCELLED' ? decision : null;
};

// Comments from staff / advisor / dean, oldest first
export const reviewerComments = (req: Pick<ApiRequest, 'events'>) =>
  (req.events ?? []).filter(e => e.comment && e.actorRole !== 'STUDENT');

export const latestComment = (req: Pick<ApiRequest, 'events'>) =>
  newestFirst(req.events).find(e => e.comment)?.comment ?? null;

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

  update: (id: number, data: { description?: string; formData?: Record<string, string> }) =>
    api.put<{ success: boolean; data: ApiRequest }>(`/requests/${id}`, data),

  requestCancel: (id: number, reason: string) =>
    api.post<{ success: boolean; data: ApiRequest }>(`/requests/${id}/cancel`, { reason }),

  reviewCancel: (id: number, approve: boolean, note?: string) =>
    api.post<{ success: boolean; data: ApiRequest }>(`/requests/${id}/cancel/review`, { approve, note }),

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
  followUp: (id: number) =>
    api.post<{ success: boolean; message: string; data: { roleLabel: string; notifiedCount: number } }>(`/requests/${id}/follow-up`),
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
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStudentDetail extends ApiStudent {
  passports: ApiPassport[];
  visas: ApiVisa[];
  healthInsurances: ApiHealthInsurance[];
  advisor: { id: number; titleEn: string | null; firstNameEn: string | null; lastNameEn: string | null } | null;
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

  create: (data: { email: string; studentId?: string; titleEn?: string; firstNameEn: string; middleNameEn?: string; lastNameEn: string; nationality?: string; program?: string; level?: string; dateOfBirth?: string }) =>
    api.post<{ success: boolean; data: ApiStudent }>('/students', data),

  approve: (id: number) => api.put<{ success: boolean; data: ApiStudent }>(`/students/${id}/approve`),

  reject: (id: number, reason: string) => api.put<{ success: boolean }>(`/students/${id}/reject`, { reason }),

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
  fileUrl: string | null;   // first page (thumbnail)
  pageUrls: string | null;  // JSON string[] of every page, in order
  createdAt: string;
  updatedAt: string;
}

/** Every page of an academic document, in order (older records only have fileUrl). */
export function academicDocPages(doc: Pick<ApiAcademicDocument, 'fileUrl' | 'pageUrls'>): string[] {
  if (doc.pageUrls) {
    try {
      const pages = JSON.parse(doc.pageUrls);
      if (Array.isArray(pages) && pages.length > 0) return pages.filter((u): u is string => typeof u === 'string');
    } catch { /* fall back to fileUrl */ }
  }
  return doc.fileUrl ? [doc.fileUrl] : [];
}

export const academicDocumentApi = {
  getAll: (studentId: number) =>
    api.get<{ success: boolean; data: ApiAcademicDocument[] }>(`/students/${studentId}/academic-documents`),
  create: (studentId: number, data: { docType: string; institution: string; issueDate: string; fileUrl?: string; pageUrls?: string }) =>
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
  test: (id: number, to: string, variables?: Record<string, string>) =>
    api.post<{ success: boolean; message: string }>(`/email-templates/${id}/test`, { to, variables }),
};

// ── Template Variables ─────────────────────────────────────────

export interface SelectOption {
  label: string;
  allowInput: boolean;
  // Text written into the document when this option is picked — falls back
  // to `label` when empty, so options saved before this field still work.
  docText?: string;
}

// Input types whose answers come from a staff-defined option list:
// 'select' = Dropdown (searchable), 'radio' = Choice (radio buttons).
export const hasOptions = (t?: string) => t === 'select' || t === 'radio';

export interface ApiTemplateVariable {
  id: number;
  key: string;
  label: string;
  description: string | null;
  inputType: 'auto' | 'text' | 'date' | 'textarea' | 'select' | 'radio';
  options: string | null; // JSON SelectOption[] stored as string
  createdAt: string;
  updatedAt: string;
}

export const templateVariableApi = {
  getAll: () =>
    api.get<{ success: boolean; data: ApiTemplateVariable[] }>('/template-variables'),

  create: (data: { key: string; label: string; description?: string; inputType?: string; options?: SelectOption[] }) =>
    api.post<{ success: boolean; data: ApiTemplateVariable }>('/template-variables', data),

  update: (id: number, data: { label?: string; description?: string; inputType?: string; options?: SelectOption[] }) =>
    api.put<{ success: boolean; data: ApiTemplateVariable }>(`/template-variables/${id}`, data),

  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/template-variables/${id}`),
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
  passportId?: number | null; // the passport the visa is stamped in
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
  fileUrl: string | null;      // front of the insurance card
  backFileUrl: string | null;  // back of the card (optional)
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
  email: string | null;
  phone: string | null;
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
  position: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  nationality: string | null;
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
  advisor: { id: number; titleEn: string | null; firstNameEn: string | null; lastNameEn: string | null; phone: string | null; email: string | null } | null;
  staffContact: { name: string; phone: string | null; email: string } | null;
}

export const studentMeApi = {
  get: () => api.get<{ success: boolean; data: ApiStudentMe }>('/students/me'),
};

// ── Passport API ───────────────────────────────────────────────

type PassportInput = {
  passportNumber: string; issuingCountry: string; issueDate: string; expiryDate: string;
  placeOfIssue?: string; imageUrl?: string;
};

export const passportApi = {
  list: (studentId: number) =>
    api.get<{ success: boolean; data: ApiPassport[] }>(`/students/${studentId}/passport`),
  // Adds a new passport; the previous current one moves to history
  create: (studentId: number, data: PassportInput) =>
    api.post<{ success: boolean; data: ApiPassport }>(`/students/${studentId}/passport`, data),
  update: (studentId: number, passportId: number, data: Partial<PassportInput>) =>
    api.put<{ success: boolean; data: ApiPassport }>(`/students/${studentId}/passport/${passportId}`, data),
  // Choose the current passport (true) or set this one inactive (false); 202 = sent for staff approval
  setCurrent: (studentId: number, passportId: number, isCurrent: boolean) =>
    api.put<{ success: boolean; data?: ApiPassport; changeRequest?: ApiChangeRequest }>(
      `/students/${studentId}/passport/${passportId}/current`, { isCurrent }),
};

// ── Visa API ───────────────────────────────────────────────────

export const visaApi = {
  getAll: (studentId: number) =>
    api.get<{ success: boolean; data: ApiVisa[] }>(`/students/${studentId}/visas`),
  create: (studentId: number, data: {
    visaType: string; issuingCountry: string; issueDate: string; expiryDate: string;
    visaNumber?: string; issuingPlace?: string; entries?: string; remarks?: string; status?: string; passportId?: number;
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
    policyNumber?: string; coverageType?: string; fileUrl?: string; backFileUrl?: string;
  }) => api.post<{ success: boolean; data: ApiHealthInsurance; changeRequest?: ApiChangeRequest }>(`/students/${studentId}/health-insurance`, data),
  update: (studentId: number, insuranceId: number, data: Partial<Omit<ApiHealthInsurance, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ success: boolean; data: ApiHealthInsurance; changeRequest?: ApiChangeRequest }>(`/students/${studentId}/health-insurance/${insuranceId}`, data),
  delete: (studentId: number, insuranceId: number) =>
    api.delete<{ success: boolean }>(`/students/${studentId}/health-insurance/${insuranceId}`),
};

// ── Dependent API ──────────────────────────────────────────────

export const dependentApi = {
  getAll: (studentId: number) =>
    api.get<{ success: boolean; data: ApiDependent[] }>(`/students/${studentId}/dependents`),
  create: (studentId: number, data: {
    relationship: string; firstName: string; lastName: string; dateOfBirth: string; gender: string; nationality: string;
    title?: string; middleName?: string; email?: string; phone?: string; passportNumber?: string; passportExpiry?: string;
    passportImageUrl?: string; visaType?: string; visaExpiry?: string; visaImageUrl?: string; visaStatus?: string;
  }) => api.post<{ success: boolean; data: ApiDependent }>(`/students/${studentId}/dependents`, data),
  update: (studentId: number, depId: number, data: Partial<Omit<ApiDependent, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ success: boolean; data: ApiDependent }>(`/students/${studentId}/dependents/${depId}`, data),
  delete: (studentId: number, depId: number) =>
    api.delete<{ success: boolean }>(`/students/${studentId}/dependents/${depId}`),
};

// ── Advisor API ────────────────────────────────────────────────

export interface ApiDeanUser { id: number; name: string; }

export const advisorApi = {
  create: (data: { email: string; titleEn?: string; firstNameEn: string; lastNameEn: string; phone?: string; nationality?: string; position?: string }) =>
    api.post<{ success: boolean; data: ApiAdvisor }>('/advisors', data),
  getMe: () =>
    api.get<{ success: boolean; data: ApiAdvisor }>('/advisors/me'),
  getAll: () =>
    api.get<{ success: boolean; data: ApiAdvisor[] }>('/advisors'),
  getById: (id: number) =>
    api.get<{ success: boolean; data: ApiAdvisor }>(`/advisors/${id}`),
  update: (data: Partial<Pick<ApiAdvisor, 'titleEn' | 'firstNameEn' | 'lastNameEn' | 'phone' | 'workPermitNumber' | 'workPermitIssue' | 'workPermitExpiry'> & { nationality?: string }>) =>
    api.put<{ success: boolean; data: ApiAdvisor }>('/advisors/me', data),
  updateById: (id: number, data: Partial<Pick<ApiAdvisor, 'titleEn' | 'firstNameEn' | 'lastNameEn' | 'phone' | 'position' | 'workPermitNumber' | 'workPermitIssue' | 'workPermitExpiry' | 'isActive'>>) =>
    api.put<{ success: boolean; data: ApiAdvisor }>(`/advisors/${id}`, data),
  getDeans: () =>
    api.get<{ success: boolean; data: ApiDeanUser[] }>('/advisors/deans'),
  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post<{ success: boolean; data: { url: string } }>('/advisors/me/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Staff setting another advisor's photo (needs ADVISOR_MANAGEMENT.edit)
  uploadPhotoFor: (advisorId: number, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post<{ success: boolean; data: { url: string } }>(`/advisors/${advisorId}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const userApi = {
  getIRStaff: () =>
    api.get<{ success: boolean; data: { id: number; name: string } | null }>('/users/ir-staff'),
};

// ── Dean Delegation API ────────────────────────────────────────

export interface ApiDeanSignatory {
  id: number;
  name: string;
  position: string | null;   // the delegate's administrative position, when delegated
  endAt: string | null;      // when the current delegation ends (null = until revoked)
  isDelegated: boolean;
  deanName: string;
}

export type ApiDelegationStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';

// One delegation period — the full history is kept
export interface ApiDeanDelegation {
  id: number;
  deanId: number;
  delegateId: number;
  startAt: string;
  endAt: string | null;
  note: string | null;
  status: ApiDelegationStatus;
  createdAt: string;
  revokedAt: string | null;
  delegate: { id: number; name: string; position: string | null };
  createdBy: { id: number; name: string };
  revokedBy: { id: number; name: string } | null;
}

export interface ApiDelegateCandidate {
  id: number;                // user id
  name: string;
  position: string | null;
}

export const deanApi = {
  getSignatory:     () => api.get<{ success: boolean; data: ApiDeanSignatory }>('/dean/signatory'),
  listDelegations:  () => api.get<{ success: boolean; data: ApiDeanDelegation[] }>('/dean/delegations'),
  createDelegation: (data: { delegateId: number; startAt?: string; endAt?: string; note?: string }) =>
    api.post<{ success: boolean; data: ApiDeanDelegation }>('/dean/delegations', data),
  revokeDelegation: (id: number) => api.post<{ success: boolean; data: ApiDeanDelegation }>(`/dean/delegations/${id}/revoke`),
  getDelegateUsers: () => api.get<{ success: boolean; data: ApiDelegateCandidate[] }>('/dean/delegates'),
};

// ── Change Requests ───────────────────────────────────────────────────────────

export interface ApiChangeRequest {
  id: number;
  studentId: number;
  entityType: string;
  entityId: number | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewNote?: string;
  createdAt: string;
  student?: { id: number; firstNameEn: string | null; lastNameEn: string | null; studentId: string | null };
}

export const changeRequestApi = {
  listPending: () =>
    api.get<{ success: boolean; data: ApiChangeRequest[] }>('/change-requests'),
  getOne: (id: number) =>
    api.get<{ success: boolean; data: ApiChangeRequest }>(`/change-requests/${id}`),
  approve: (id: number, reviewNote?: string) =>
    api.post(`/change-requests/${id}/approve`, { reviewNote }),
  reject: (id: number, reviewNote: string) =>
    api.post(`/change-requests/${id}/reject`, { reviewNote }),
  cancel: (id: number) =>
    api.delete(`/change-requests/${id}`),
  // Every request still waiting for staff on this kind of record — new ones and edits/removals of existing ones
  listPendingOfType: (entityType: string, studentId: number) =>
    api.get<{ success: boolean; data: ApiChangeRequest[] }>(
      `/change-requests/pending?entityType=${entityType}&studentId=${studentId}`,
    ),
  getPendingForEntity: (entityType: string, entityId: number | null, studentId: number) =>
    api.get<{ success: boolean; data: ApiChangeRequest | null }>(
      `/change-requests/entity?entityType=${entityType}&entityId=${entityId ?? ''}&studentId=${studentId}`,
    ),
};

// ── Generated Document / Signing API ──────────────────────────────────────────

export interface ApiDocSignature {
  id:           number;
  docId:        number;
  role:         string;
  signerUserId: number;
  imageUrl:     string;
  signedAt:     string;
}

export interface ApiGeneratedDoc {
  id:            number;
  templateId:    number;
  studentId:     number;
  generatedBy:   number;
  requestId:     number | null;
  fileUrl:       string | null;
  signedFileUrl: string | null;
  signedBy:      string | null;
  signedAt:      string | null;
  signingMode:   string | null;
  createdAt:     string;
}

// Files are served as short-lived signed URLs; storage sends no CORS headers,
// so anything that needs the bytes in the browser goes through the API.
export const fileApi = {
  download: (fileId: number) =>
    api.get<Blob>(`/files/${fileId}/download`, { responseType: 'blob' }),
  freshUrl: (fileId: number) =>
    api.get<{ success: boolean; data: { url: string; mimeType: string } }>(`/files/${fileId}/url`),
};

/** A file URL's extension, read from its path — signed URLs carry a query string after it. */
export function fileExtension(url: string): string {
  try {
    return new URL(url).pathname.split('.').pop()?.toLowerCase() ?? '';
  } catch {
    return url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  }
}
export const isPdfUrl = (url: string) => fileExtension(url) === 'pdf';
export const isImageUrl = (url: string) => ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension(url));

export const generatedDocApi = {
  generate: (requestId: number, templateId: number, formData: Record<string, string>) =>
    api.post<{ success: boolean; data: ApiGeneratedDoc }>(`/requests/${requestId}/generate-pdf`, { templateId, formData }),

  getByRequest: (requestId: number) =>
    api.get<{ success: boolean; data: ApiGeneratedDoc[] }>(`/requests/${requestId}/generated-documents`),

  // The PDF bytes via the API (the public storage URL can't be fetched cross-origin)
  download: (docId: number) =>
    api.get<Blob>(`/generated-documents/${docId}/download`, { responseType: 'blob' }),

  getById: (docId: number) =>
    api.get<{ success: boolean; data: ApiGeneratedDoc }>(`/generated-documents/${docId}`),

  getSignatures: (docId: number) =>
    api.get<{ success: boolean; data: ApiDocSignature[] }>(`/generated-documents/${docId}/signatures`),

  addDigitalSignature: (docId: number, role: string, imageDataUrl: string) =>
    api.post<{ success: boolean; data: { imageUrl: string; allSigned: boolean } }>(
      `/generated-documents/${docId}/signatures`,
      { role, imageDataUrl }
    ),

  uploadSignedPdf: (docId: number, file: File, role: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('role', role);
    return api.post<{ success: boolean; data: ApiGeneratedDoc }>(
      `/generated-documents/${docId}/upload-signed`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  finalize: (docId: number) =>
    api.post<{ success: boolean; data: ApiGeneratedDoc }>(`/generated-documents/${docId}/finalize`),
};

export default api;
