import * as dependentRepository from '../../repositories/dependent.repository';
import * as documentRepository from '../../repositories/document.repository';
import { createNotification } from '../notification.service';
import { uploadToR2, deleteFromR2, keyFromUrl } from '../external/r2.service';

const EXPIRY_WARN_DAYS = 90;

async function _checkDependentExpiry(
  studentId: number,
  passportExpiry: Date | null,
  visaExpiry: Date | null,
  name: string
): Promise<void> {
  const student = await dependentRepository.findStudentUserId(studentId);
  if (!student) return;

  const now = Date.now();
  const check = (expiry: Date | null, docType: string) => {
    if (!expiry) return;
    const days = Math.ceil((expiry.getTime() - now) / 86_400_000);
    if (days <= EXPIRY_WARN_DAYS) {
      createNotification({
        userId: student.userId,
        type: 'VISA_ALERT',
        title: `Dependent ${docType} Expiring Soon`,
        message: `${name}'s ${docType} expires in ${days} day(s). Please take action.`,
        link: '/student/profile',
      }).catch(console.error);
    }
  };

  check(passportExpiry, 'Passport');
  check(visaExpiry, 'Visa');
}

export const getDependents = (studentId: number) =>
  dependentRepository.findByStudentId(studentId);

export const getDependentById = async (depId: number, studentId: number) => {
  const dep = await dependentRepository.findByIdAndStudentId(depId, studentId);
  if (!dep) {
    throw Object.assign(new Error('Dependent not found'), { statusCode: 404 });
  }
  return dep;
};

export const createDependent = async (
  studentId: number,
  dto: {
    relationship: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    title?: string;
    middleName?: string;
    email?: string;
    phone?: string;
    passportNumber?: string;
    passportExpiry?: string;
    passportImageUrl?: string;
    visaType?: string;
    visaExpiry?: string;
    visaImageUrl?: string;
    visaStatus?: string;
  }
) => {
  if (!dto.relationship || !dto.firstName || !dto.lastName || !dto.dateOfBirth || !dto.gender || !dto.nationality) {
    throw Object.assign(
      new Error('relationship, firstName, lastName, dateOfBirth, gender, nationality are required'),
      { statusCode: 400 }
    );
  }

  const dep = await dependentRepository.create({
    studentId,
    relationship: dto.relationship,
    title: dto.title,
    firstName: dto.firstName,
    middleName: dto.middleName,
    lastName: dto.lastName,
    email: dto.email,
    phone: dto.phone,
    dateOfBirth: new Date(dto.dateOfBirth),
    gender: dto.gender as never,
    nationality: dto.nationality,
    passportNumber: dto.passportNumber,
    passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
    passportImageUrl: dto.passportImageUrl,
    visaType: dto.visaType,
    visaExpiry: dto.visaExpiry ? new Date(dto.visaExpiry) : undefined,
    visaImageUrl: dto.visaImageUrl,
    visaStatus: (dto.visaStatus as never) ?? 'ACTIVE',
  });

  _checkDependentExpiry(studentId, dep.passportExpiry, dep.visaExpiry, dto.firstName).catch(console.error);

  return dep;
};

export const updateDependent = async (
  depId: number,
  studentId: number,
  dto: {
    relationship?: string;
    title?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    passportNumber?: string;
    passportExpiry?: string;
    passportImageUrl?: string;
    visaType?: string;
    visaExpiry?: string;
    visaImageUrl?: string;
    visaStatus?: string;
  }
) => {
  const existing = await dependentRepository.findByIdAndStudentId(depId, studentId);
  if (!existing) {
    throw Object.assign(new Error('Dependent not found'), { statusCode: 404 });
  }

  const updated = await dependentRepository.updateById(depId, {
    relationship: dto.relationship,
    title: dto.title,
    firstName: dto.firstName,
    middleName: dto.middleName,
    lastName: dto.lastName,
    email: dto.email,
    phone: dto.phone,
    gender: dto.gender as never,
    nationality: dto.nationality,
    passportNumber: dto.passportNumber,
    passportImageUrl: dto.passportImageUrl,
    visaType: dto.visaType,
    visaImageUrl: dto.visaImageUrl,
    visaStatus: dto.visaStatus as never,
    dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
    visaExpiry: dto.visaExpiry ? new Date(dto.visaExpiry) : undefined,
  });

  _checkDependentExpiry(studentId, updated.passportExpiry, updated.visaExpiry, updated.firstName).catch(console.error);

  return updated;
};

export const deleteDependent = async (depId: number, studentId: number): Promise<void> => {
  const existing = await dependentRepository.findByIdAndStudentId(depId, studentId);
  if (!existing) {
    throw Object.assign(new Error('Dependent not found'), { statusCode: 404 });
  }
  await dependentRepository.removeById(depId);
};

export const getDependentDocuments = (depId: number) =>
  documentRepository.findByDependentId(depId);

export const uploadDependentDocument = async (
  depId: number,
  studentId: number,
  file: Express.Multer.File,
  name?: string,
  description?: string,
  uploadedBy?: number
) => {
  const dep = await dependentRepository.findByIdAndStudentId(depId, studentId);
  if (!dep) {
    throw Object.assign(new Error('Dependent not found'), { statusCode: 404 });
  }

  const { url } = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'dependents');
  return documentRepository.create({
    dependentId: depId,
    name: name || file.originalname,
    description,
    fileUrl: url,
    fileType: file.mimetype,
    fileSize: file.size,
    uploadedBy: uploadedBy!,
  });
};

export const deleteDependentDocument = async (docId: number): Promise<void> => {
  const doc = await documentRepository.findById(docId);
  if (!doc) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  await deleteFromR2(keyFromUrl(doc.fileUrl));
  await documentRepository.removeById(doc.id);
};
