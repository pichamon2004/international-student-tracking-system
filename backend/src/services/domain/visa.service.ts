import * as visaRepository from '../../repositories/visa.repository';
import { uploadToR2 } from '../external/r2.service';

export const getVisas = (studentId: number) =>
  visaRepository.findByStudentId(studentId);

export const createVisa = (studentId: number, dto: {
  visaNumber?: string;
  visaType: string;
  status?: string;
  issuingCountry: string;
  issuingPlace?: string;
  entries?: string;
  remarks?: string;
  imageUrl?: string;
  arrivalImageUrl?: string;
  departedImageUrl?: string;
  passportImageUrl?: string;
  isCurrent?: boolean;
  issueDate: string;
  expiryDate: string;
}) => {
  if (!dto.visaType || !dto.issuingCountry || !dto.issueDate || !dto.expiryDate) {
    throw Object.assign(
      new Error('visaType, issuingCountry, issueDate, and expiryDate are required'),
      { statusCode: 400 }
    );
  }
  return visaRepository.create({
    studentId,
    visaNumber: dto.visaNumber,
    visaType: dto.visaType,
    status: dto.status as never,
    issuingCountry: dto.issuingCountry,
    issuingPlace: dto.issuingPlace,
    entries: dto.entries,
    remarks: dto.remarks,
    imageUrl: dto.imageUrl,
    arrivalImageUrl: dto.arrivalImageUrl,
    departedImageUrl: dto.departedImageUrl,
    passportImageUrl: dto.passportImageUrl,
    isCurrent: dto.isCurrent,
    issueDate: new Date(dto.issueDate),
    expiryDate: new Date(dto.expiryDate),
  });
};

export const updateVisa = (visaId: number, dto: {
  visaNumber?: string;
  visaType?: string;
  status?: string;
  issuingCountry?: string;
  issuingPlace?: string;
  entries?: string;
  remarks?: string;
  imageUrl?: string;
  arrivalImageUrl?: string;
  departedImageUrl?: string;
  passportImageUrl?: string;
  isCurrent?: boolean;
  issueDate?: string;
  expiryDate?: string;
}) =>
  visaRepository.updateById(visaId, {
    visaNumber: dto.visaNumber,
    visaType: dto.visaType,
    status: dto.status as never,
    issuingCountry: dto.issuingCountry,
    issuingPlace: dto.issuingPlace,
    entries: dto.entries,
    remarks: dto.remarks,
    imageUrl: dto.imageUrl,
    arrivalImageUrl: dto.arrivalImageUrl,
    departedImageUrl: dto.departedImageUrl,
    passportImageUrl: dto.passportImageUrl,
    isCurrent: dto.isCurrent,
    ...(dto.issueDate && { issueDate: new Date(dto.issueDate) }),
    ...(dto.expiryDate && { expiryDate: new Date(dto.expiryDate) }),
  });

export const deleteVisa = (visaId: number) =>
  visaRepository.removeById(visaId);

export const uploadVisaImage = async (file: Express.Multer.File): Promise<{ url: string }> => {
  const { url } = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'visas');
  return { url };
};
