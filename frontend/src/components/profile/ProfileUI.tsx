/* Shared building blocks for the student profile information pages
   (personal, passport, visa, ...) so they keep one consistent look. */

/* Value tile — light box with a small label above the value */
export function InfoTile({ label, value, tone = 'default', className = '' }: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'danger';
  className?: string;
}) {
  const box = tone === 'danger' ? 'bg-red-50' : 'bg-[#F3F7FD]';
  const text = tone === 'danger' ? 'text-red-600' : 'text-gray-800';
  const lbl = tone === 'danger' ? 'text-red-500' : 'text-primary/70';
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl px-3 py-2.5 min-w-0 ${box} ${className}`}>
      <span className={`text-[11px] font-medium ${lbl}`}>{label}</span>
      <span className={`text-sm font-semibold break-words ${text}`}>{value === null || value === undefined || value === '' ? '—' : value}</span>
    </div>
  );
}

/* Section heading with the accent bar; extra content (badges) goes after the title */
export function SectionTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="w-1 h-5 rounded-full bg-primary" />
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

/* Bordered section card */
export function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 flex flex-col gap-4 ${className}`}>
      {children}
    </div>
  );
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysRemaining(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
}

// "9 years 11 months remaining" / "15 days remaining" / "Expired"
export function remainingText(expiryDate: string): string {
  const days = daysRemaining(expiryDate);
  if (days <= 0) return 'Expired';
  if (days < 60) return `${days} day${days === 1 ? '' : 's'} remaining`;
  const now = new Date();
  const exp = new Date(expiryDate);
  let months = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
  if (exp.getDate() < now.getDate()) months -= 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [y > 0 && `${y} year${y === 1 ? '' : 's'}`, m > 0 && `${m} month${m === 1 ? '' : 's'}`].filter(Boolean);
  return `${parts.join(' ')} remaining`;
}

// Matches ALERT_DAYS in backend/src/services/scheduler.service.ts — the first
// expiry reminder (visa, passport, ...) goes out this many days before expiry.
export const FIRST_REMINDER_DAYS = 90;

export type ExpiryStatus = 'valid' | 'expiring' | 'critical' | 'expired';

export function expiryStatus(expiryDate: string): ExpiryStatus {
  const days = daysRemaining(expiryDate);
  if (days <= 0) return 'expired';
  if (days < 14) return 'critical';
  if (days <= FIRST_REMINDER_DAYS) return 'expiring';
  return 'valid';
}

export const EXPIRY_STYLE: Record<ExpiryStatus, { label: string; badge: string; bar: string; text: string }> = {
  valid:    { label: 'Valid',         badge: 'bg-green-100 text-green-700', bar: 'bg-green-600', text: 'text-green-700' },
  expiring: { label: 'Expiring soon', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', text: 'text-amber-700' },
  critical: { label: 'Expiring soon', badge: 'bg-red-100 text-red-600',     bar: 'bg-red-600',   text: 'text-red-600' },
  expired:  { label: 'Expired',       badge: 'bg-gray-100 text-gray-500',   bar: 'bg-gray-400',  text: 'text-gray-500' },
};

/* "N days remaining · Valid A – B" + a bar that shrinks as validity runs out */
export function ValidityBar({ issueDate, expiryDate, note, rangeLabel = 'Valid' }: {
  issueDate: string; expiryDate: string; note?: React.ReactNode; rangeLabel?: string;
}) {
  const style = EXPIRY_STYLE[expiryStatus(expiryDate)];
  const start = new Date(issueDate).getTime();
  const end = new Date(expiryDate).getTime();
  const pct = end > start ? Math.max(0, Math.min(100, ((end - Date.now()) / (end - start)) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
        <span className={`font-semibold ${style.text}`}>{remainingText(expiryDate)}</span>
        <span className="text-gray-500">{rangeLabel} {fmtDate(issueDate)} – {fmtDate(expiryDate)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  );
}
