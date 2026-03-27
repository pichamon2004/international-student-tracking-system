import { Resend } from 'resend';
import prisma from '../utils/prisma';

let resend: Resend | null = null;

const getClient = (): Resend => {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured — skipping email to:', to);
    return;
  }
  try {
    const from = process.env.EMAIL_FROM || 'IST System <noreply@ist.kku.ac.th>';
    await getClient().emails.send({ from, to, subject, html, ...(text && { text }) });
  } catch (err) {
    console.error('[Email] Failed to send email to', to, err);
  }
};

/**
 * Send email using an EmailTemplate from the database.
 * Replaces {{variable}} placeholders with values from `variables`.
 */
export const sendTemplateEmail = async (
  to: string,
  templateId: number,
  variables: Record<string, string>
): Promise<void> => {
  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
  if (!template || !template.isActive) {
    console.warn('[Email] Template not found or inactive:', templateId);
    return;
  }

  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  }

  await sendEmail(to, subject, body);
};
