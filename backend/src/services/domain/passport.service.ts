import axios from 'axios';
import FormData from 'form-data';
import * as passportRepository from '../../repositories/passport.repository';
import { uploadToR2 } from '../external/r2.service';

export const getPassport = async (studentId: number) => {
  const passport = await passportRepository.findByStudentId(studentId);
  if (!passport) {
    throw Object.assign(new Error('Passport not found'), { statusCode: 404 });
  }
  return passport;
};

export const upsertPassport = (studentId: number, dto: {
  passportNumber: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  isCurrent?: boolean;
  imageUrl?: string;
}) =>
  passportRepository.upsertByStudentId(studentId, {
    passportNumber: dto.passportNumber,
    issuingCountry: dto.issuingCountry,
    issueDate: new Date(dto.issueDate),
    expiryDate: new Date(dto.expiryDate),
    placeOfIssue: dto.placeOfIssue,
    isCurrent: dto.isCurrent,
    imageUrl: dto.imageUrl,
  });

export const uploadPassportImage = async (file: Express.Multer.File): Promise<{ url: string }> => {
  const { url } = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'passports');
  return { url };
};

export const scanPassport = async (file: Express.Multer.File): Promise<unknown> => {
  const form = new FormData();
  form.append('image', file.buffer, { filename: file.originalname, contentType: file.mimetype });

  const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
  const response = await axios.post(`${pythonUrl}/scan-passport`, form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });

  return response.data?.data ?? response.data;
};
