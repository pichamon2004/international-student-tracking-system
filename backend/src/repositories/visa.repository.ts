import prisma from '../utils/prisma';
import { VisaStatus } from '@prisma/client';

export interface CreateVisaDto {
  studentId:        number;
  visaType:         string;
  issuingCountry:   string;
  issueDate:        Date;
  expiryDate:       Date;
  visaNumber?:      string;
  status?:          VisaStatus;
  issuingPlace?:    string;
  entries?:         string;
  remarks?:         string;
  imageUrl?:        string;
  arrivalImageUrl?: string;
  departedImageUrl?: string;
  passportImageUrl?: string;
  isCurrent?:       boolean;
}

export interface UpdateVisaDto {
  visaNumber?:      string;
  visaType?:        string;
  status?:          VisaStatus;
  issuingCountry?:  string;
  issuingPlace?:    string;
  entries?:         string;
  remarks?:         string;
  imageUrl?:        string;
  arrivalImageUrl?: string;
  departedImageUrl?: string;
  passportImageUrl?: string;
  isCurrent?:       boolean;
  issueDate?:       Date;
  expiryDate?:      Date;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.visa.findMany({
    where:   { studentId },
    orderBy: { createdAt: 'desc' },
  });

export const findActiveByStudentIds = (studentIds: number[]) =>
  prisma.visa.findMany({
    where:  { studentId: { in: studentIds }, status: 'ACTIVE' },
    select: { studentId: true, visaType: true, expiryDate: true },
  });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateVisaDto) =>
  prisma.visa.create({
    data: {
      studentId:        dto.studentId,
      visaType:         dto.visaType,
      issuingCountry:   dto.issuingCountry,
      issueDate:        dto.issueDate,
      expiryDate:       dto.expiryDate,
      visaNumber:       dto.visaNumber,
      status:           dto.status,
      issuingPlace:     dto.issuingPlace,
      entries:          dto.entries,
      remarks:          dto.remarks,
      imageUrl:         dto.imageUrl,
      arrivalImageUrl:  dto.arrivalImageUrl,
      departedImageUrl: dto.departedImageUrl,
      passportImageUrl: dto.passportImageUrl,
      isCurrent:        dto.isCurrent,
    },
  });

export const updateById = (id: number, dto: UpdateVisaDto) =>
  prisma.visa.update({
    where: { id },
    data: {
      visaNumber:       dto.visaNumber,
      visaType:         dto.visaType,
      status:           dto.status,
      issuingCountry:   dto.issuingCountry,
      issuingPlace:     dto.issuingPlace,
      entries:          dto.entries,
      remarks:          dto.remarks,
      imageUrl:         dto.imageUrl,
      arrivalImageUrl:  dto.arrivalImageUrl,
      departedImageUrl: dto.departedImageUrl,
      passportImageUrl: dto.passportImageUrl,
      isCurrent:        dto.isCurrent,
      issueDate:        dto.issueDate,
      expiryDate:       dto.expiryDate,
    },
  });

export const removeById = (id: number) =>
  prisma.visa.delete({ where: { id } });
