import prisma from '../utils/prisma';
import { Gender, VisaStatus } from '@prisma/client';

export interface CreateDependentDto {
  studentId:        number;
  relationship:     string;
  firstName:        string;
  lastName:         string;
  dateOfBirth:      Date;
  gender:           Gender;
  nationality:      string;
  title?:           string;
  middleName?:      string;
  email?:           string;
  phone?:           string;
  passportNumber?:  string;
  passportExpiry?:  Date;
  passportImageUrl?: string;
  visaType?:        string;
  visaExpiry?:      Date;
  visaImageUrl?:    string;
  visaStatus?:      VisaStatus;
}

export interface UpdateDependentDto {
  relationship?:     string;
  title?:            string;
  firstName?:        string;
  middleName?:       string;
  lastName?:         string;
  email?:             string;
  phone?:             string;
  dateOfBirth?:      Date;
  gender?:           Gender;
  nationality?:      string;
  passportNumber?:   string;
  passportExpiry?:   Date;
  passportImageUrl?: string;
  visaType?:         string;
  visaExpiry?:       Date;
  visaImageUrl?:     string;
  visaStatus?:       VisaStatus;
}

// ── Queries ───────────────────────────────────────────────────────

export const findByStudentId = (studentId: number) =>
  prisma.dependent.findMany({
    where:   { studentId },
    orderBy: { createdAt: 'desc' },
  });

export const findByIdAndStudentId = (id: number, studentId: number) =>
  prisma.dependent.findFirst({ where: { id, studentId } });

export const findStudentUserId = (studentId: number) =>
  prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateDependentDto) =>
  prisma.dependent.create({
    data: {
      studentId:        dto.studentId,
      relationship:     dto.relationship,
      firstName:        dto.firstName,
      lastName:         dto.lastName,
      dateOfBirth:      dto.dateOfBirth,
      gender:           dto.gender,
      nationality:      dto.nationality,
      title:            dto.title,
      middleName:       dto.middleName,
      email:            dto.email,
      phone:            dto.phone,
      passportNumber:   dto.passportNumber,
      passportExpiry:   dto.passportExpiry,
      passportImageUrl: dto.passportImageUrl,
      visaType:         dto.visaType,
      visaExpiry:       dto.visaExpiry,
      visaImageUrl:     dto.visaImageUrl,
      visaStatus:       dto.visaStatus ?? 'ACTIVE',
    },
  });

export const updateById = (id: number, dto: UpdateDependentDto) =>
  prisma.dependent.update({
    where: { id },
    data: {
      relationship:     dto.relationship,
      title:            dto.title,
      firstName:        dto.firstName,
      middleName:       dto.middleName,
      lastName:         dto.lastName,
      email:            dto.email,
      phone:            dto.phone,
      dateOfBirth:      dto.dateOfBirth,
      gender:           dto.gender,
      nationality:      dto.nationality,
      passportNumber:   dto.passportNumber,
      passportExpiry:   dto.passportExpiry,
      passportImageUrl: dto.passportImageUrl,
      visaType:         dto.visaType,
      visaExpiry:       dto.visaExpiry,
      visaImageUrl:     dto.visaImageUrl,
      visaStatus:       dto.visaStatus,
    },
  });

export const removeById = (id: number) =>
  prisma.dependent.delete({ where: { id } });
