import { Response } from 'express';
import { AuthRequest } from '../types';
import * as studentService from '../services/domain/student.service';
import * as changeRequestService from '../services/domain/changeRequest.service';
import { UpdateStudentDto } from '../repositories/student.repository';
import prisma from '../utils/prisma';

export const getStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string | undefined;
  const advisorId = req.query.advisorId ? parseInt(req.query.advisorId as string) : undefined;

  const { students, total, totalPages } = await studentService.getStudents({ page, limit, search, advisorId });
  res.json({ success: true, data: students, pagination: { page, limit, total, totalPages } });
};

export const getStudentById = async (req: AuthRequest, res: Response): Promise<void> => {
  const student = await studentService.getStudentById(parseInt(req.params.id));
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
  res.json({ success: true, data: student });
};

export const getMyStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await studentService.getMyProfile(req.user!.userId);
  if (!profile) { res.status(404).json({ success: false, message: 'Student profile not found' }); return; }
  res.json({ success: true, data: profile });
};

export const createStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, studentId, titleEn, firstNameEn, middleNameEn, lastNameEn, nationality, program, level, dateOfBirth } = req.body;
  if (!email || !firstNameEn || !lastNameEn) {
    res.status(400).json({ success: false, message: 'email, firstNameEn, and lastNameEn are required' });
    return;
  }
  const student = await studentService.createStudent({ email, studentId, titleEn, firstNameEn, middleNameEn, lastNameEn, nationality, program, level, dateOfBirth });
  res.status(201).json({ success: true, data: student });
};

export const updateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const studentDbId = parseInt(req.params.id);

  if (req.user?.activeRole === 'STUDENT') {
    const currentStudent = await prisma.student.findUnique({ where: { id: studentDbId } });
    if (currentStudent?.registrationStatus === 'ACTIVE') {
      const studentFields = {
        titleEn: req.body.titleEn,
        firstNameEn: req.body.firstNameEn,
        middleNameEn: req.body.middleNameEn,
        lastNameEn: req.body.lastNameEn,
        gender: req.body.gender,
        nationality: req.body.nationality,
        religion: req.body.religion,
        homeCountry: req.body.homeCountry,
        phone: req.body.phone,
        addressInThailand: req.body.addressInThailand,
        homeAddress: req.body.homeAddress,
        emergencyContact: req.body.emergencyContact,
        emergencyEmail: req.body.emergencyEmail,
        emergencyPhone: req.body.emergencyPhone,
        emergencyRelation: req.body.emergencyRelation,
        dateOfBirth: req.body.dateOfBirth,
      };
      const cr = await changeRequestService.submitChange(studentDbId, 'STUDENT_PROFILE', studentDbId, 'UPDATE', studentFields);
      res.status(202).json({ success: true, changeRequest: cr });
      return;
    }
  }

  const {
    titleEn, firstNameEn, middleNameEn, lastNameEn,
    studentId, gender, nationality, religion, homeCountry,
    email, phone, addressInThailand, homeAddress,
    emergencyContact, emergencyEmail, emergencyPhone, emergencyRelation,
    faculty, program, level, academicStatus, scholarship, advisorId,
    registrationStatus, registrationStep, rejectionReason, photoUrl,
    dateOfBirth, enrollmentDate, expectedGraduation,
  } = req.body;

  const dto: UpdateStudentDto = {
    titleEn, firstNameEn, middleNameEn, lastNameEn,
    studentId, gender, nationality, religion, homeCountry,
    email, phone, addressInThailand, homeAddress,
    emergencyContact, emergencyEmail, emergencyPhone, emergencyRelation,
    faculty, program, level, academicStatus, scholarship, advisorId,
    registrationStatus, registrationStep, rejectionReason, photoUrl,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
    expectedGraduation: expectedGraduation ? new Date(expectedGraduation) : undefined,
  };

  const student = await studentService.updateStudent(studentDbId, dto);
  res.json({ success: true, data: student });
};

export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  await studentService.deleteStudent(parseInt(req.params.id));
  res.json({ success: true, message: 'Student deleted successfully' });
};

export const uploadStudentPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ success: false, message: 'No image file provided' }); return; }
  const result = await studentService.uploadPhoto(parseInt(req.params.id), req.file);
  res.json({ success: true, data: result });
};

export const submitPhase2 = async (req: AuthRequest, res: Response): Promise<void> => {
  const student = await studentService.submitPhase2(req.user!.userId);
  res.json({ success: true, data: student });
};

export const approveStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const updated = await studentService.approveStudent(parseInt(req.params.id));
  res.json({ success: true, data: updated });
};

export const rejectStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const updated = await studentService.rejectStudent(parseInt(req.params.id), req.body.reason);
  res.json({ success: true, data: updated });
};

export const importStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  const { rows } = req.body as {
    rows: {
      titleEn?: string;
      email: string;
      firstNameEn: string;
      middleNameEn?: string;
      lastNameEn: string;
      studentId?: string;
      nationality?: string;
      program?: string;
      level?: string;
      dateOfBirth?: string;
    }[];
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ success: false, message: 'rows array is required' });
    return;
  }

  const results = await Promise.allSettled(
    rows.map(row =>
      studentService.createStudent({
        titleEn: row.titleEn,
        email: row.email,
        firstNameEn: row.firstNameEn,
        middleNameEn: row.middleNameEn,
        lastNameEn: row.lastNameEn,
        studentId: row.studentId,
        nationality: row.nationality,
        program: row.program,
        level: row.level,
        dateOfBirth: row.dateOfBirth,
      })
    )
  );

  const summary = results.map((r, i) => ({
    row: i + 1,
    email: rows[i].email,
    success: r.status === 'fulfilled',
    error: r.status === 'rejected' ? (r.reason as Error).message : undefined,
  }));

  const successCount = summary.filter(s => s.success).length;
  res.json({ success: true, data: { summary, successCount, failCount: rows.length - successCount } });
};
