import { Resend } from 'resend';

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

export const applyTemplateVariables = (
  text: string,
  variables: Record<string, string>
): string => {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
};
