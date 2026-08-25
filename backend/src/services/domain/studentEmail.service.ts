import * as studentRepository from '../../repositories/student.repository';
import * as emailTemplateRepository from '../../repositories/emailTemplate.repository';
import { sendEmail, applyTemplateVariables } from '../external/email.service';

type StudentForEmail = NonNullable<Awaited<ReturnType<typeof studentRepository.findByIdForEmail>>>;

const daysUntil = (date: Date | undefined): string => {
  if (!date) return '-';
  const ms = date.getTime() - Date.now();
  return String(Math.max(0, Math.ceil(ms / 86_400_000)));
};

const buildStudentVariables = (student: StudentForEmail): Record<string, string> => {
  const name = [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') || '-';
  const currentVisa      = student.visas[0];
  const currentPassport  = student.passports[0];
  const currentInsurance = student.healthInsurances[0];
  const email = student.email ?? student.user?.email ?? '-';
  const visaExpiry        = currentVisa?.expiryDate.toDateString()       ?? '-';
  const passportExpiry    = currentPassport?.expiryDate.toDateString()   ?? '-';
  const insuranceExpiry   = currentInsurance?.expiryDate.toDateString()  ?? '-';
  const visaDaysRemaining = daysUntil(currentVisa?.expiryDate);

  return {
    student_name:     name,
    student_id:       student.studentId    ?? '-',
    student_email:    email,
    email,                                            // alias — matches the picker in Settings
    program:          student.program      ?? '-',
    faculty:          student.faculty      ?? '-',

    visa_type:        currentVisa?.visaType ?? '-',
    visa_expiry:      visaExpiry,
    visa_expiry_date: visaExpiry,                      // alias — matches the picker in Settings
    days_remaining:   visaDaysRemaining,                // legacy alias, kept for existing templates
    visa_days_remaining: visaDaysRemaining,

    passport_number:  currentPassport?.passportNumber ?? '-',
    passport_expiry:  passportExpiry,
    passport_expiry_date: passportExpiry,
    passport_days_remaining: daysUntil(currentPassport?.expiryDate),

    health_insurance_provider:       currentInsurance?.provider ?? '-',
    health_insurance_policy_number:  currentInsurance?.policyNumber ?? '-',
    health_insurance_type:           currentInsurance?.coverageType ?? '-',
    health_insurance_expiry_date:    insuranceExpiry,
    health_insurance_days_remaining: daysUntil(currentInsurance?.expiryDate),
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
