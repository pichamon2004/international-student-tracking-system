'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  RiArrowLeftLine, RiCheckLine, RiFileTextLine, RiPrinterLine,
  RiAlertLine, RiCheckboxCircleLine, RiSparklingLine,
  RiUser3Line, RiBookOpenLine, RiPlaneLine, RiSendPlaneLine,
  RiEyeLine, RiEditLine, RiInformationLine, RiCloseLine,
} from 'react-icons/ri';
import {
  type DocTemplate,
  type StudentProfile,
} from '@/lib/mockRequestData';
import { requestTypeApi, requestApi, studentMeApi, advisorApi, userApi } from '@/lib/api';
import DateSelect from '@/components/ui/DateSelect';

/* ─── Variable labels ────────────────────────────────────────── */
const VARIABLE_LABELS: Record<string, string> = {
  student_name:     'Student Full Name',
  student_id:       'Student ID',
  student_title:    'Title (Mr./Mrs./Miss)',
  thai_tel:         'Thai Tel. No.',
  email:            'Email Address',
  education_level:  'Education Level',
  funding_type:     'Funding Type',
  scholarship_name: 'Scholarship Name',
  program:          'Program',
  destination:      'Destination (City & Country)',
  purpose:          'Purpose of Travel',
  duration_days:    'Duration (days/months)',
  leave_start:      'Leave Start Date',
  leave_end:        'Leave Return Date',
  visa_expiry:      'Visa Expiry Date',
  advisor_name:     'Advisor Name',
  date:             'Document Date',
};

function varLabel(tokenOrKey: string): string {
  const key = tokenOrKey.replace(/^\{\{|\}\}$/g, '');
  return VARIABLE_LABELS[key] ?? key.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function extractVarTokens(body: string): string[] {
  if (body.includes('data-var=')) {
    return Array.from(new Set(
      Array.from(body.matchAll(/data-var="(\{\{[^"]+\}\})"/g)).map(m => m[1])
    ));
  }
  if (body.includes('{{')) {
    return Array.from(new Set(
      Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map(m => `{{${m[1]}}}`)
    ));
  }
  // Old chip format: <span ...>Label</span> without data-var
  const tokens: string[] = [];
  const spanTexts = Array.from(body.matchAll(/<span[^>]*>([^<]+)<\/span>/g)).map(m => m[1].trim());
  for (const text of spanTexts) {
    const key = CHIP_LABEL_TO_KEY[text];
    if (key) tokens.push(`{{${key}}}`);
  }
  return Array.from(new Set(tokens));
}

function buildBaseVarMap(profile: StudentProfile): Record<string, string> {
  const levelMap: Record<string, string> = { PHD: 'Doctoral', MASTER: "Master's", BACHELOR: "Bachelor's" };
  return {
    student_name: `${profile.titleEn} ${profile.firstNameEn} ${profile.lastNameEn}`,
    student_id: profile.studentId,
    student_title: profile.titleEn,
    thai_tel: profile.phone,
    email: profile.email,
    education_level: levelMap[profile.level] ?? profile.level,
    funding_type: profile.fundingType,
    scholarship_name: profile.scholarship,
    program: profile.program,
    advisor_name: profile.advisorName,
    visa_expiry: profile.visaExpiry,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
  };
}

const CHIP_LABEL_TO_KEY: Record<string, string> = {
  'Student Name': 'student_name', 'Student Full Name': 'student_name',
  'Student ID': 'student_id', 'Title (Mr./Mrs./Miss)': 'student_title',
  'Thai Tel. No.': 'thai_tel', 'Email': 'email', 'Email Address': 'email',
  'Education Level': 'education_level', 'Funding Type': 'funding_type',
  'Scholarship Name': 'scholarship_name', 'Program': 'program',
  'Destination City & Country': 'destination', 'Destination (City & Country)': 'destination',
  'Purpose of Leave': 'purpose', 'Purpose of Travel': 'purpose',
  'Duration (days/months)': 'duration_days', 'Leave Start Date': 'leave_start',
  'Leave End Date': 'leave_end', 'Leave Return Date': 'leave_end',
  'Visa Expiry': 'visa_expiry', 'Visa Expiry Date': 'visa_expiry',
  'Advisor Name': 'advisor_name', 'Current Date': 'date',
};

function mergeTemplateToHtml(body: string, vars: Record<string, string>): string {
  if (body.includes('data-var=')) {
    // New format: chips have data-var attribute
    return body.replace(
      /<span[^>]*data-var="(\{\{[^"]+\}\})"[^>]*>[^<]*<\/span>/g,
      (_, varToken) => {
        if (varToken.startsWith('{{sig_')) return '';
        const key = varToken.slice(2, -2);
        const value = vars[key];
        if (!value || value === '—') return `<mark style="background:#FFF3CD;border-radius:3px;padding:2px 6px;color:#b45309;">${varToken}</mark>`;
        return value;
      }
    );
  }
  if (body.startsWith('<')) {
    // Old format: chips saved as <span>Label</span> without data-var (Chrome strips data-var)
    return body.replace(/<span[^>]*>([^<]+)<\/span>/g, (match, text) => {
      const trimmed = text.trim();
      const key = CHIP_LABEL_TO_KEY[trimmed];
      if (!key) return trimmed;
      const value = vars[key];
      if (!value || value === '—') return `<mark style="background:#FFF3CD;border-radius:3px;padding:2px 6px;color:#b45309;">${trimmed}</mark>`;
      return value;
    });
  }
  // Plain text with {{key}} tokens
  const escaped = body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = vars[key];
      if (!value || value === '—') return `<mark style="background:#FFF3CD;border-radius:3px;padding:2px 6px;color:#b45309;">{{${key}}}</mark>`;
      return value;
    })
    .replace(/\n/g, '<br>');
  return `<div style="white-space:pre-wrap;font-family:'Times New Roman',serif;line-height:2;">${escaped}</div>`;
}

function getMissingVars(body: string, vars: Record<string, string>): string[] {
  return extractVarTokens(body).filter(token => {
    if (token.startsWith('{{sig_')) return false;
    const key = token.slice(2, -2);
    return !vars[key] || vars[key] === '—';
  });
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition bg-white';
const labelCls = 'text-xs font-semibold text-gray-600 mb-1.5 block';

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function RadioOption({ name, value, checked, onChange, label }: {
  name: string; value: string; checked: boolean; onChange: () => void; label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center transition shrink-0',
        checked ? 'border-primary bg-primary' : 'border-gray-300 group-hover:border-primary/50')}>
        {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className={clsx('text-sm transition', checked ? 'text-primary font-medium' : 'text-gray-600')}>{label}</span>
    </label>
  );
}

function CheckOption({ checked, onChange, label }: {
  checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; label: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className={clsx('mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0',
        checked ? 'bg-primary border-primary' : 'border-gray-300 group-hover:border-primary/50')}>
        {checked && <RiCheckLine size={12} className="text-white" />}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="text-sm text-gray-600 leading-relaxed">{label}</span>
    </label>
  );
}

function SectionCard({ icon, title, subtitle, color = 'blue', children }: {
  icon: React.ReactNode; title: string; subtitle?: string; color?: 'blue' | 'green' | 'amber'; children: React.ReactNode;
}) {
  const gradients: Record<string, string> = { blue: 'from-blue-50 to-white', green: 'from-green-50 to-white', amber: 'from-amber-50 to-white' };
  const iconBgs: Record<string, string> = { blue: 'bg-primary/10 text-primary', green: 'bg-green-500/10 text-green-600', amber: 'bg-amber-400/10 text-amber-600' };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={clsx('flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gradient-to-r', gradients[color])}>
        <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', iconBgs[color])}>{icon}</div>
        <div>
          <h3 className="text-sm font-bold text-gray-700">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOCUMENT PREVIEW MODAL — A4 style, full realistic look
═══════════════════════════════════════════════════════════════ */
function DocumentPreviewModal({
  docs,
  varMap,
  onClose,
  onConfirm,
  deanName,
  irStaffName,
}: {
  docs: DocTemplate[];
  varMap: Record<string, string>;
  onClose: () => void;
  onConfirm: () => void;
  deanName?: string;
  irStaffName?: string;
}) {
  const [activeDoc, setActiveDoc] = useState(0);
  const currentDoc = docs[activeDoc];
  const missingVars = getMissingVars(currentDoc?.body ?? '', varMap);
  const mergedHtml = mergeTemplateToHtml(currentDoc?.body ?? '', varMap);
  const allTokens = extractVarTokens(currentDoc?.body ?? '').filter(v => !v.startsWith('{{sig_'));
  const sigVars = (currentDoc?.variables ?? []).filter((v: string) => v.startsWith('{{sig_'));
  const SIG_NAMES: Record<string, string> = {
    '{{sig_student}}':  varMap['student_name'] || '',
    '{{sig_advisor}}':  varMap['advisor_name'] || '',
    '{{sig_ir_staff}}': irStaffName ?? '',
    '{{sig_dean}}':     deanName ?? '',
  };
  const SIG_ROLES: Record<string, string> = {
    '{{sig_student}}':  'Student',
    '{{sig_advisor}}':  'Advisor',
    '{{sig_ir_staff}}': 'IR Staff',
    '{{sig_dean}}':     'Dean',
  };
  const filledCount = allTokens.filter(v => { const k = v.slice(2, -2); return varMap[k] && varMap[k] !== '—'; }).length;
  const totalVars = allTokens.length;
  const fillPct = totalVars ? Math.round((filledCount / totalVars) * 100) : 100;

  function handlePrint() {
    const sigBlockHtml = sigVars.length > 0 ? `
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;">
        <div style="display:grid;grid-template-columns:repeat(${Math.min(sigVars.length, 4)},1fr);gap:24px;">
          ${sigVars.map((sv: string) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
              <div style="width:100%;height:40px;border-bottom:2px solid #1f2937;margin-top:16px;"></div>
              ${SIG_NAMES[sv] ? `<span style="font-size:11px;font-weight:600;text-align:center;">${SIG_NAMES[sv]}</span>` : ''}
              <span style="font-size:11px;color:#6b7280;">${SIG_ROLES[sv] ?? sv}</span>
              <span style="font-size:10px;color:#9ca3af;">Date ....../....../......</span>
            </div>
          `).join('')}
        </div>
      </div>` : '';

    const pw = window.open('', '_blank');
    if (!pw) return;
    const origin = window.location.origin;
    const printBody = mergedHtml.replace(/src="\/kkulogo2\.png"/g, `src="${origin}/kkulogo2.png"`);
    pw.document.write(`<!DOCTYPE html><html><head><title>Document</title>
      <style>
        body { margin: 0; padding: 25mm 20mm; font-family: 'Times New Roman', serif; font-size: 14px; color: #222; line-height: 2; }
        @media print { @page { margin: 0; } body { padding: 25mm 20mm; } }
      </style>
    </head><body>
      ${printBody}
      ${sigBlockHtml}
    </body></html>`);
    pw.document.close();
    pw.focus();
    pw.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden" style={{ maxHeight: '92vh' }}>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <RiFileTextLine size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Document Preview</p>
              <p className="text-xs text-gray-400">Based on staff-configured template · Review before submitting</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <RiCloseLine size={18} />
          </button>
        </div>

        {/* Fill progress + tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-2">
              {docs.length > 1 && docs.map((doc, i) => (
                <button key={doc.id} onClick={() => setActiveDoc(i)}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                    activeDoc === i ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                  {doc.name}
                </button>
              ))}
            </div>
            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', fillPct === 100 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600')}>
              {fillPct === 100 ? '✓ All fields filled' : `${filledCount}/${totalVars} fields filled`}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1 mb-3">
            <div className={clsx('h-1 rounded-full transition-all duration-500', fillPct === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${fillPct}%` }} />
          </div>

          {missingVars.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3">
              <RiAlertLine size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Unfilled fields:</span>{' '}
                {missingVars.map(v => varLabel(v)).join(', ')} — highlighted in yellow below.
              </p>
            </div>
          )}
        </div>

        {/* A4 Document */}
        <div className="flex-1 overflow-y-auto bg-gray-100 px-6 pb-4">
          {/* A4 paper */}
          <div className="bg-white shadow-xl mx-auto" style={{ width: '100%', minHeight: '297mm', padding: '25mm 20mm', fontFamily: "'Times New Roman', serif" }}>
            {/* Document content */}
            <div
              style={{ fontSize: '14px', color: '#222', lineHeight: '2' }}
              dangerouslySetInnerHTML={{ __html: mergedHtml }}
            />
            {/* Signature block */}
            {sigVars.length > 0 && (
              <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(sigVars.length, 4)}, 1fr)`, gap: '24px' }}>
                  {sigVars.map((sv: string) => (
                    <div key={sv} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '100%', height: '40px', borderBottom: '2px solid #1f2937', marginTop: '16px' }} />
                      {SIG_NAMES[sv] && <span style={{ fontSize: '11px', fontWeight: 600, textAlign: 'center' }}>{SIG_NAMES[sv]}</span>}
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{SIG_ROLES[sv] ?? sv}</span>
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>Date ....../....../......</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
            <RiPrinterLine size={15} /> Print
          </button>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
              Back to Edit
            </button>
            <button onClick={onConfirm}
              className="px-6 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 active:scale-95 transition shadow-sm">
              Confirm & Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREVIEW TOGGLE BUTTON BAR
═══════════════════════════════════════════════════════════════ */
function PreviewBar({
  docs,
  varMap,
  canSubmit,
  onOpenPreview,
  onSubmit,
  submitDisabled,
}: {
  docs: DocTemplate[];
  varMap: Record<string, string>;
  canSubmit: boolean;
  onOpenPreview: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
}) {
  const allTokens = docs.flatMap(d => extractVarTokens(d.body).filter(v => !v.startsWith('{{sig_')));
  const filledCount = allTokens.filter(v => { const k = v.slice(2, -2); return varMap[k] && varMap[k] !== '—'; }).length;
  const totalVars = allTokens.length;
  const fillPct = totalVars ? Math.round((filledCount / totalVars) * 100) : 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Progress indicator */}
      <div className="h-1 bg-gray-100">
        <div className={clsx('h-1 transition-all duration-500', fillPct === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${fillPct}%` }} />
      </div>

      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', fillPct === 100 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-primary')}>
            {fillPct === 100 ? '✓ Document ready' : `${filledCount}/${totalVars} fields filled`}
          </span>
          {docs.length > 0 && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Template: {docs.map(d => d.name).join(', ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {docs.length > 0 && (
            <button
              type="button"
              onClick={onOpenPreview}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-white transition"
            >
              <RiEyeLine size={15} /> Preview Document
            </button>
          )}
          <button
            type="button"
            disabled={submitDisabled}
            onClick={onSubmit}
            className={clsx(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm',
              !submitDisabled ? 'bg-primary text-white hover:bg-primary/90 active:scale-[0.99]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <RiSendPlaneLine size={15} /> Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAVE REQUEST FORM (typeId === '1')
═══════════════════════════════════════════════════════════════ */
interface LeaveForm {
  prefix: string; fullName: string; studentId: string; thaiTel: string; email: string;
  educationLevel: '' | 'Doctoral' | "Master's" | "Bachelor's" | 'Others';
  educationOther: string; fundingType: string; scholarshipName: string; program: string;
  destination: string; duration: string;
  purposeOfTravel: '' | 'Personal Purposes' | 'Research/Conference' | 'Others';
  purposeOther: string; startDate: string; endDate: string; visaExpiryDate: string;
  reEntry: boolean; acknowledge: boolean;
}

const levelLabel: Record<string, LeaveForm['educationLevel']> = {
  PHD: 'Doctoral', MASTER: "Master's", BACHELOR: "Bachelor's",
};

function buildLeaveVarMap(form: LeaveForm, profile: StudentProfile): Record<string, string> {
  const base = buildBaseVarMap(profile);
  return {
    ...base,
    student_name: form.fullName || base.student_name,
    student_id: form.studentId || base.student_id,
    student_title: form.prefix || base.student_title,
    thai_tel: form.thaiTel || base.thai_tel,
    email: form.email || base.email,
    education_level: form.educationLevel ? (form.educationLevel === 'Others' ? form.educationOther : form.educationLevel) : base.education_level,
    funding_type: form.fundingType || base.funding_type,
    scholarship_name: form.scholarshipName || base.scholarship_name,
    program: form.program || base.program,
    destination: form.destination || '—',
    purpose: form.purposeOfTravel === 'Research/Conference'
      ? 'Data Collection, Conference, or Research/Thesis-related Purposes'
      : form.purposeOfTravel === 'Others' ? form.purposeOther : form.purposeOfTravel || '—',
    duration_days: form.duration || '—',
    leave_start: form.startDate || '—',
    leave_end: form.endDate || '—',
    visa_expiry: form.visaExpiryDate || base.visa_expiry,
  };
}

function LeaveRequestForm({ requiredDocs, onSubmit, profile }: { requiredDocs: DocTemplate[]; onSubmit: () => void; profile: StudentProfile }) {
  const p = profile;
  const [form, setForm] = useState<LeaveForm>({
    prefix: p.titleEn, fullName: `${p.firstNameEn} ${p.lastNameEn}`, studentId: p.studentId,
    thaiTel: p.phone, email: p.email, educationLevel: levelLabel[p.level] ?? '', educationOther: '',
    fundingType: p.fundingType, scholarshipName: p.scholarship, program: p.program,
    destination: '', duration: '', purposeOfTravel: '', purposeOther: '', startDate: '', endDate: '',
    visaExpiryDate: p.visaExpiry, reEntry: false, acknowledge: false,
  });
  const [showPreview, setShowPreview] = useState(false);

  const setText = (key: keyof LeaveForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const varMap = buildLeaveVarMap(form, p);
  const canSubmit = !!(form.fullName && form.studentId && form.acknowledge);

  return (
    <>
      <div className="flex flex-col gap-5">

        <SectionCard icon={<RiUser3Line size={14} />} title="Personal Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Prefix" required><input value={form.prefix} onChange={setText('prefix')} placeholder="Mr. / Ms. / Dr." className={inputCls} /></Field>
            <Field label="Full Name" required><input value={form.fullName} onChange={setText('fullName')} placeholder="Full name as in passport" className={inputCls} /></Field>
            <Field label="Student ID" required><input value={form.studentId} onChange={setText('studentId')} placeholder="e.g. 65XXXXXXXX" className={inputCls} /></Field>
            <Field label="Thai Tel. No"><input value={form.thaiTel} onChange={setText('thaiTel')} placeholder="0XX-XXX-XXXX" className={inputCls} /></Field>
            <Field label="E-mail"><input value={form.email} onChange={setText('email')} type="email" placeholder="student@kku.ac.th" className={inputCls} /></Field>
          </div>
        </SectionCard>

        <SectionCard icon={<RiBookOpenLine size={14} />} title="Education Information">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelCls}>Education Level</label>
              <div className="flex flex-wrap gap-4">
                {(['Doctoral', "Master's", "Bachelor's", 'Others'] as const).map(lvl => (
                  <RadioOption key={lvl} name="educationLevel" value={lvl} checked={form.educationLevel === lvl}
                    onChange={() => setForm(prev => ({ ...prev, educationLevel: lvl }))} label={lvl} />
                ))}
              </div>
              {form.educationLevel === 'Others' && (
                <input value={form.educationOther} onChange={setText('educationOther')} placeholder="Please specify" className={`${inputCls} mt-2 max-w-xs`} />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Funding Type"><input value={form.fundingType} onChange={setText('fundingType')} placeholder="e.g. Scholarship" className={inputCls} /></Field>
              <Field label="Scholarship Name"><input value={form.scholarshipName} onChange={setText('scholarshipName')} placeholder="Scholarship name" className={inputCls} /></Field>
              <Field label="Program"><input value={form.program} onChange={setText('program')} placeholder="e.g. Computer Engineering" className={inputCls} /></Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<RiPlaneLine size={14} />} title="Travel Information">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Destination (City and Country)" required><input value={form.destination} onChange={setText('destination')} placeholder="e.g. Tokyo, Japan" className={inputCls} /></Field>
              <Field label="Duration (days/months)" required><input value={form.duration} onChange={setText('duration')} placeholder="e.g. 14 days" className={inputCls} /></Field>
            </div>
            <div>
              <label className={labelCls}>Purpose of Travel <span className="text-red-400">*</span></label>
              <div className="flex flex-col gap-2.5">
                <RadioOption name="purposeOfTravel" value="Personal Purposes" checked={form.purposeOfTravel === 'Personal Purposes'}
                  onChange={() => setForm(prev => ({ ...prev, purposeOfTravel: 'Personal Purposes' }))} label="Personal Purposes" />
                <RadioOption name="purposeOfTravel" value="Research/Conference" checked={form.purposeOfTravel === 'Research/Conference'}
                  onChange={() => setForm(prev => ({ ...prev, purposeOfTravel: 'Research/Conference' }))}
                  label="Data Collection, Conference, or Research/Thesis-related Purposes" />
                <RadioOption name="purposeOfTravel" value="Others" checked={form.purposeOfTravel === 'Others'}
                  onChange={() => setForm(prev => ({ ...prev, purposeOfTravel: 'Others' }))} label="Others" />
              </div>
              {form.purposeOfTravel === 'Others' && (
                <input value={form.purposeOther} onChange={setText('purposeOther')} placeholder="Please specify" className={`${inputCls} max-w-sm mt-2`} />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Start Date" required><DateSelect value={form.startDate} onChange={(v) => setForm(p => ({ ...p, startDate: v }))} /></Field>
              <Field label="End Date" required><DateSelect value={form.endDate} onChange={(v) => setForm(p => ({ ...p, endDate: v }))} /></Field>
              <Field label="Visa Expiry Date"><DateSelect value={form.visaExpiryDate} onChange={(v) => setForm(p => ({ ...p, visaExpiryDate: v }))} /></Field>
            </div>
          </div>
        </SectionCard>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
          <CheckOption checked={form.reEntry} onChange={e => setForm(prev => ({ ...prev, reEntry: e.target.checked }))}
            label="I have already applied for a re-entry permit" />
          <CheckOption checked={form.acknowledge} onChange={e => setForm(prev => ({ ...prev, acknowledge: e.target.checked }))}
            label={<>I understand that by taking this leave of absence, I am responsible for complying with all university policies related to leaves and maintaining my student status. I also acknowledge that I must inform the university of any changes to my leave plans.<span className="text-red-400 ml-0.5">*</span></>} />
        </div>

        {/* Action bar */}
        <PreviewBar
          docs={requiredDocs}
          varMap={varMap}
          canSubmit={canSubmit}
          onOpenPreview={() => setShowPreview(true)}
          onSubmit={onSubmit}
          submitDisabled={!canSubmit}
        />
      </div>

      {showPreview && requiredDocs.length > 0 && (
        <DocumentPreviewModal
          docs={requiredDocs}
          varMap={varMap}
          onClose={() => setShowPreview(false)}
          onConfirm={() => { setShowPreview(false); onSubmit(); }}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DYNAMIC REQUEST FORM
═══════════════════════════════════════════════════════════════ */
const PROFILE_AUTO_FILL_KEYS = new Set([
  'student_name', 'student_id', 'student_title', 'thai_tel', 'email',
  'education_level', 'funding_type', 'scholarship_name', 'program',
  'advisor_name', 'visa_expiry', 'date',
]);

const USER_INPUT_FIELD_DEFS: Record<string, { label: string; type: 'text' | 'date' | 'email' | 'textarea'; placeholder?: string }> = {
  destination:   { label: 'Destination (City and Country)', type: 'text',    placeholder: 'e.g. Tokyo, Japan' },
  purpose:       { label: 'Purpose of Travel',              type: 'textarea', placeholder: 'Describe the purpose of your trip...' },
  duration_days: { label: 'Duration (days/months)',         type: 'text',    placeholder: 'e.g. 14 days' },
  leave_start:   { label: 'Start Date',                     type: 'date' },
  leave_end:     { label: 'Return Date',                    type: 'date' },
  // Profile fields that may be empty — show as input if not filled
  student_title:    { label: 'Title (Mr./Mrs./Miss)',  type: 'text',  placeholder: 'e.g. Mr.' },
  thai_tel:         { label: 'Thai Tel. No.',          type: 'text',  placeholder: '0XX-XXX-XXXX' },
  education_level:  { label: 'Education Level',        type: 'text',  placeholder: 'e.g. Master\'s' },
  funding_type:     { label: 'Funding Type',           type: 'text',  placeholder: 'e.g. Scholarship' },
  scholarship_name: { label: 'Scholarship Name',       type: 'text',  placeholder: 'Scholarship name' },
  advisor_name:     { label: 'Advisor Name',           type: 'text',  placeholder: 'Advisor full name' },
  visa_expiry:      { label: 'Visa Expiry Date',       type: 'date' },
};

function DynamicRequestForm({ typeName, requiredDocs, onSubmit, profile, deanName, irStaffName }: { typeName: string; requiredDocs: DocTemplate[]; onSubmit: () => void; profile: StudentProfile; deanName?: string; irStaffName?: string }) {
  const p = profile;
  const baseVarMap = useMemo(() => buildBaseVarMap(p), [p]);

  const allVarTokens = useMemo(() => Array.from(new Set(
    requiredDocs.flatMap(d => extractVarTokens(d.body).filter(v => !v.startsWith('{{sig_')))
  )), [requiredDocs]);

  // All profile fields with their values
  const ALL_PROFILE_FIELDS: Record<string, { label: string; value: string }> = {
    student_name:     { label: 'Full Name',       value: [p.titleEn, p.firstNameEn, p.lastNameEn].filter(Boolean).join(' ') },
    student_id:       { label: 'Student ID',      value: p.studentId },
    email:            { label: 'Email',            value: p.email },
    program:          { label: 'Program',          value: p.program },
    student_title:    { label: 'Title',            value: p.titleEn },
    thai_tel:         { label: 'Thai Tel. No.',    value: p.phone },
    education_level:  { label: 'Education Level', value: baseVarMap['education_level'] ?? '' },
    funding_type:     { label: 'Funding Type',     value: p.fundingType },
    scholarship_name: { label: 'Scholarship',      value: p.scholarship },
    advisor_name:     { label: 'Advisor',          value: p.advisorName },
    visa_expiry:      { label: 'Visa Expiry',      value: p.visaExpiry },
  };

  // Classify template variables: auto-filled (has value) vs needs input (empty or non-profile)
  const { autoFilledFields, missingProfileKeys, userInputKeys } = useMemo(() => {
    const auto: { label: string; value: string; key: string }[] = [];
    const missingProfile: string[] = [];
    const userInput: string[] = [];

    allVarTokens.forEach(token => {
      const key = token.slice(2, -2);
      if (PROFILE_AUTO_FILL_KEYS.has(key)) {
        const profileField = ALL_PROFILE_FIELDS[key];
        if (profileField && profileField.value && profileField.value !== '—') {
          auto.push({ label: profileField.label, value: profileField.value, key });
        } else if (USER_INPUT_FIELD_DEFS[key]) {
          missingProfile.push(key); // has profile key but value is empty
        }
      } else if (USER_INPUT_FIELD_DEFS[key]) {
        userInput.push(key);
      }
    });
    return { autoFilledFields: auto, missingProfileKeys: missingProfile, userInputKeys: userInput };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVarTokens, p]);

  const allInputKeys = [...missingProfileKeys, ...userInputKeys];
  const [formData, setFormData] = useState<Record<string, string>>(() =>
    Object.fromEntries(allInputKeys.map(k => [k, baseVarMap[k] || '']))
  );
  const [note, setNote] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const varMap: Record<string, string> = useMemo(() => ({
    ...baseVarMap,
    ...Object.fromEntries(allInputKeys.map(k => [k, formData[k] || '—'])),
  }), [baseVarMap, allInputKeys, formData]);

  const hasInputFields = allInputKeys.length > 0;
  const allInputsFilled = allInputKeys.every(k => formData[k]?.trim());
  const submitDisabled = hasInputFields && !allInputsFilled;

  return (
    <>
      <div className="flex flex-col gap-5">
        {autoFilledFields.length > 0 && (
          <SectionCard icon={<RiCheckboxCircleLine size={14} />} title="Auto-filled from Your Profile"
            subtitle="These fields are pre-filled — no action needed" color="green">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {autoFilledFields.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5 px-3.5 py-2.5 rounded-xl bg-green-50/60 border border-green-100">
                  <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">{label}</span>
                  <span className="text-sm font-medium text-gray-700 truncate">{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {hasInputFields && (
          <SectionCard icon={<RiEditLine size={14} />} title="Additional Information Required"
            subtitle="Please fill in the following fields" color="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allInputKeys.map(key => {
                const def = USER_INPUT_FIELD_DEFS[key];
                if (!def) return null;
                return (
                  <Field key={key} label={def.label} required>
                    {def.type === 'textarea' ? (
                      <textarea value={formData[key] ?? ''} onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={3} placeholder={def.placeholder} className={`${inputCls} resize-none`} />
                    ) : (
                      <input type={def.type} value={formData[key] ?? ''} onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={def.placeholder} className={inputCls} />
                    )}
                  </Field>
                );
              })}
            </div>
          </SectionCard>
        )}

        <SectionCard icon={<RiInformationLine size={14} />} title="Additional Notes" subtitle="Optional — any extra details for this request">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder={`Any additional details for your ${typeName} request...`} className={`${inputCls} resize-none`} />
        </SectionCard>

        <PreviewBar
          docs={requiredDocs}
          varMap={varMap}
          canSubmit={!submitDisabled}
          onOpenPreview={() => setShowPreview(true)}
          onSubmit={onSubmit}
          submitDisabled={submitDisabled}
        />
      </div>

      {showPreview && requiredDocs.length > 0 && (
        <DocumentPreviewModal
          docs={requiredDocs}
          varMap={varMap}
          onClose={() => setShowPreview(false)}
          onConfirm={() => { setShowPreview(false); onSubmit(); }}
          deanName={deanName}
          irStaffName={irStaffName}
        />
      )}
    </>
  );
}

/* ─── Success Screen ─────────────────────────────────────────── */
function SuccessScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
          <RiCheckLine size={44} className="text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <RiSparklingLine size={16} className="text-white" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-primary">Request Submitted!</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">Your request has been received and is being reviewed. You will be notified by email once it is processed.</p>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-green-600 font-medium"><RiCheckboxCircleLine size={15} /> Submitted</div>
        <div className="w-8 h-px bg-gray-200" />
        <div className="flex items-center gap-1.5 text-gray-400"><RiEyeLine size={15} /> Under Review</div>
        <div className="w-8 h-px bg-gray-200" />
        <div className="flex items-center gap-1.5 text-gray-400"><RiCheckLine size={15} /> Approved</div>
      </div>
      <button onClick={onBack} className="px-8 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-[0.99] transition shadow-sm">
        Back to Requests
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
const EMPTY_PROFILE: StudentProfile = {
  studentId: '', titleEn: '', firstNameEn: '', lastNameEn: '',
  email: '', phone: '', faculty: '', program: '',
  level: 'BACHELOR', scholarship: '', fundingType: '', advisorName: '', visaExpiry: '',
};

export default function NewRequestFormPage({ params }: { params: { typeId: string } }) {
  const { typeId } = params;
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<{ id: number; name: string; description: string } | null>(null);
  const [requiredDocs, setRequiredDocs] = useState<DocTemplate[]>([]);
  const [profile, setProfile] = useState<StudentProfile>(EMPTY_PROFILE);
  const [studentDbId, setStudentDbId] = useState<number>(0);
  const [deanName, setDeanName] = useState<string>('');
  const [irStaffName, setIrStaffName] = useState<string>('');

  useEffect(() => {
    Promise.all([
      advisorApi.getDean(),
      userApi.getIRStaff(),
    ]).then(([deanRes, staffRes]) => {
      const d = deanRes.data.data;
      if (d) setDeanName([d.titleEn, d.firstNameEn, d.lastNameEn].filter(Boolean).join(' '));
      const s = staffRes.data.data;
      if (s) setIrStaffName(s.name);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [typeRes, meRes] = await Promise.all([
          requestTypeApi.getAll(),
          studentMeApi.get(),
        ]);

        const rt = typeRes.data.data.find(r => r.id === Number(typeId));
        if (rt) {
          setConfig({ id: rt.id, name: rt.name, description: rt.description ?? '' });
          setRequiredDocs(
            rt.documentTemplates
              .filter(d => d.isActive)
              .map(d => ({
                id: d.id,
                name: d.name,
                description: d.description ?? '',
                isActive: d.isActive,
                variables: d.variables ? (JSON.parse(d.variables) as string[]) : [],
                body: d.body,
              }))
          );
        }

        const s = meRes.data.data;
        setStudentDbId(s.id);
        const adv = s.advisor;
        const advisorName = adv
          ? [adv.titleEn, adv.firstNameEn, adv.lastNameEn].filter(Boolean).join(' ')
          : '';
        const visaExpiry = s.visas?.[0]?.expiryDate?.slice(0, 10) ?? '';
        const levelMap: Record<string, StudentProfile['level']> = {
          PHD: 'PHD', MASTER: 'MASTER', BACHELOR: 'BACHELOR',
        };
        setProfile({
          studentId:   s.studentId ?? '',
          titleEn:     s.titleEn ?? '',
          firstNameEn: s.firstNameEn ?? '',
          lastNameEn:  s.lastNameEn ?? '',
          email:       s.email ?? '',
          phone:       s.phone ?? '',
          faculty:     s.faculty ?? '',
          program:     s.program ?? '',
          level:       levelMap[s.level ?? ''] ?? 'BACHELOR',
          scholarship: s.scholarship ?? '',
          fundingType: '',
          advisorName,
          visaExpiry,
        });
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [typeId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await requestApi.create({
        studentId: studentDbId,
        requestTypeId: Number(typeId),
        title: config?.name ?? 'New Request',
        description: '',
        formData: {},
      });
    } catch (e) {
      console.error('Failed to submit request:', e);
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full">
        <SuccessScreen onBack={() => router.push('/student/request')} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full py-20 text-center text-gray-400 text-sm animate-pulse">
        Loading request type…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full ">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-primary">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => router.back()}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition">
              <RiArrowLeftLine size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">{config?.name ?? 'Request Form'}</h1>
              {config?.description && <p className="text-xs text-white/70 mt-0.5">{config.description}</p>}
            </div>
          </div>
        </div>
        {requiredDocs.length > 0 && (
          <div className="px-6 py-3 bg-blue-50/50 border-t border-blue-100 flex items-center gap-2">
            <RiInformationLine size={14} className="text-primary shrink-0" />
            <p className="text-xs text-primary">
              This request will generate <strong>{requiredDocs.length} document{requiredDocs.length > 1 ? 's' : ''}</strong> using staff-configured templates: {requiredDocs.map(d => d.name).join(', ')}
            </p>
          </div>
        )}
      </div>

      <DynamicRequestForm typeName={config?.name ?? 'Request'} requiredDocs={requiredDocs} onSubmit={handleSubmit} profile={profile} deanName={deanName} irStaffName={irStaffName} />

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-600">Submitting request…</p>
          </div>
        </div>
      )}
    </div>
  );
}
