import * as studentRepository from '../../repositories/student.repository';
import * as emailTemplateRepository from '../../repositories/emailTemplate.repository';
import { sendEmail, applyTemplateVariables } from '../external/email.service';

type StudentForEmail = NonNullable<Awaited<ReturnType<typeof studentRepository.findByIdForEmail>>>;

const buildStudentVariables = (student: StudentForEmail): Record<string, string> => {
  const name = [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') || '-';
  const currentVisa    = student.visas[0];
  const currentPassport = student.passports[0];

  return {
    student_name:     name,
    student_id:       student.studentId    ?? '-',
    student_email:    student.email        ?? '-',
    program:          student.program      ?? '-',
    faculty:          student.faculty      ?? '-',
    visa_type:        currentVisa?.visaType               ?? '-',
    visa_expiry:      currentVisa?.expiryDate.toDateString()    ?? '-',
    passport_number:  currentPassport?.passportNumber     ?? '-',
    passport_expiry:  currentPassport?.expiryDate.toDateString() ?? '-',
  };
};

// ── Service functions ─────────────────────────────────────────────

export const sendEmailToStudent = async (
  studentId: number,
  templateId: number,
  extraVariables?: Record<string, string>,
) => {
  const [student, template] = await Promise.all([
    studentRepository.findByIdForEmail(studentId),
    emailTemplateRepository.findById(templateId),
  ]);

  if (!student) throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  if (!template || !template.isActive) {
    throw Object.assign(new Error('Email template not found or inactive'), { statusCode: 404 });
  }

  const recipientEmail = student.email || student.user.email;
  if (!recipientEmail) {
    throw Object.assign(new Error('Student has no email address'), { statusCode: 400 });
  }

  const variables = { ...buildStudentVariables(student), ...(extraVariables ?? {}) };
  const subject   = applyTemplateVariables(template.subject, variables);
  const body      = applyTemplateVariables(template.body, variables);

  await sendEmail(recipientEmail, subject, body);
  return { recipient: recipientEmail, variables };
};

export const sendCustomEmailToStudent = async (
  studentId: number,
  subject: string,
  html: string,
) => {
  const student = await studentRepository.findByIdEmailOnly(studentId);
  if (!student) throw Object.assign(new Error('Student not found'), { statusCode: 404 });

  const recipientEmail = student.email || student.user.email;
  if (!recipientEmail) {
    throw Object.assign(new Error('Student has no email address'), { statusCode: 400 });
  }

  await sendEmail(recipientEmail, subject, html);
  return { recipient: recipientEmail };
};

export const getStudentEmailVariables = async (studentId: number) => {
  const student = await studentRepository.findByIdForEmail(studentId);
  if (!student) throw Object.assign(new Error('Student not found'), { statusCode: 404 });

  const recipientEmail = student.email || student.user.email;
  const variables = buildStudentVariables(student);
  return { recipientEmail, variables };
};
