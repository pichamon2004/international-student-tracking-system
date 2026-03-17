export type Role = 'ADMIN' | 'STAFF';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type VisaStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'CANCELLED';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface Student {
  id: number;
  studentId: string;
  titleTh?: string;
  firstNameTh?: string;
  lastNameTh?: string;
  titleEn?: string;
  firstNameEn: string;
  lastNameEn: string;
  dateOfBirth: string;
  gender: Gender;
  nationality: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  faculty?: string;
  program?: string;
  level?: string;
  advisorName?: string;
  enrollmentDate?: string;
  expectedGraduation?: string;
  isActive: boolean;
  createdAt: string;
  passport?: Passport;
  visas?: Visa[];
  documents?: Document[];
}

export interface Passport {
  id: number;
  studentId: number;
  passportNumber: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  mrzLine1?: string;
  mrzLine2?: string;
  imageUrl?: string;
}

export interface Visa {
  id: number;
  studentId: number;
  visaNumber?: string;
  visaType: string;
  status: VisaStatus;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  entries?: string;
  remarks?: string;
  imageUrl?: string;
}

export interface Document {
  id: number;
  studentId: number;
  name: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface DocumentTemplate {
  id: number;
  name: string;
  description?: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PassportScanResult {
  passportNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  nationality?: string;
  issuingCountry?: string;
  mrzLine1?: string;
  mrzLine2?: string;
  confidence?: number;
}
