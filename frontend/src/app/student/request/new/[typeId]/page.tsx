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
  mockStudentProfile,
  type DocTemplate,
  type StudentProfile,
} from '@/lib/mockRequestData';
import { requestTypeApi, requestApi } from '@/lib/api';

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
  return Array.from(new Set(
    Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map(m => `{{${m[1]}}}`)
  ));
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

function mergeTemplateToHtml(body: string, vars: Record<string, string>): string {
  if (body.startsWith('<') || body.includes('data-var=')) {
    return body.replace(
      /<span[^>]*data-var="(\{\{[^"]+\}\})"[^>]*>[^<]*<\/span>/g,
      (_, varToken) => {
        const key = varToken.slice(2, -2);
        if (varToken.startsWith('{{sig_')) {
          const val = vars[key] ?? '';
          return `<div style="display:flex;align-items:center;gap:8px;margin:12px 0;padding:8px 16px;border:1.5px dashed #ccc;border-radius:6px;color:#666;font-size:13px;">✍ ${varLabel(varToken)} ..........................${val ? `&nbsp;<strong>${val}</strong>` : ''}</div>`;
        }
        const value = vars[key];
        if (!value || value === '—') return `<mark style="background:#FFF3CD;border-radius:3px;padding:2px 6px;color:#b45309;">${varToken}</mark>`;
        return `<strong style="color:#0776BC;">${value}</strong>`;
      }
    );
  }
  const escaped = body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = vars[key];
      if (!value || value === '—') return `<mark style="background:#FFF3CD;border-radius:3px;padding:2px 6px;color:#b45309;">{{${key}}}</mark>`;
      return `<strong style="color:#0776BC;">${value}</strong>`;
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
}: {
  docs: DocTemplate[];
  varMap: Record<string, string>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [activeDoc, setActiveDoc] = useState(0);
  const missingVars = getMissingVars(docs[activeDoc]?.body ?? '', varMap);
  const mergedHtml = mergeTemplateToHtml(docs[activeDoc]?.body ?? '', varMap);
  const allTokens = extractVarTokens(docs[activeDoc]?.body ?? '').filter(v => !v.startsWith('{{sig_'));
  const filledCount = allTokens.filter(v => { const k = v.slice(2, -2); return varMap[k] && varMap[k] !== '—'; }).length;
  const totalVars = allTokens.length;
  const fillPct = totalVars ? Math.round((filledCount / totalVars) * 100) : 100;

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
            {/* Document content — exactly as defined in the template */}
            <div
              style={{ fontSize: '14px', color: '#222', lineHeight: '2' }}
              dangerouslySetInnerHTML={{ __html: mergedHtml }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
          <button onClick={() => window.print()}
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

function LeaveRequestForm({ requiredDocs, onSubmit }: { requiredDocs: DocTemplate[]; onSubmit: () => void }) {
  const p = mockStudentProfile;
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
              <Field label="Start Date" required><input value={form.startDate} onChange={setText('startDate')} type="date" className={inputCls} /></Field>
              <Field label="End Date" required><input value={form.endDate} onChange={setText('endDate')} type="date" className={inputCls} /></Field>
              <Field label="Visa Expiry Date"><input value={form.visaExpiryDate} onChange={setText('visaExpiryDate')} type="date" className={inputCls} /></Field>
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
};

function DynamicRequestForm({ typeName, requiredDocs, onSubmit }: { typeName: string; requiredDocs: DocTemplate[]; onSubmit: () => void }) {
  const p = mockStudentProfile;
  const baseVarMap = useMemo(() => buildBaseVarMap(p), []);

  const allVarTokens = useMemo(() => Array.from(new Set(
    requiredDocs.flatMap(d => extractVarTokens(d.body).filter(v => !v.startsWith('{{sig_')))
  )), [requiredDocs]);

  const userInputKeys = useMemo(() => allVarTokens
    .map(v => v.slice(2, -2))
    .filter(k => !PROFILE_AUTO_FILL_KEYS.has(k) && USER_INPUT_FIELD_DEFS[k]), [allVarTokens]);

  const [formData, setFormData] = useState<Record<string, string>>(Object.fromEntries(userInputKeys.map(k => [k, ''])));
  const [note, setNote] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const varMap: Record<string, string> = useMemo(() => ({
    ...baseVarMap,
    ...Object.fromEntries(userInputKeys.map(k => [k, formData[k] || '—'])),
  }), [baseVarMap, userInputKeys, formData]);

  const hasUserInputFields = userInputKeys.length > 0;
  const allInputsFilled = userInputKeys.every(k => formData[k]?.trim());

  const autoFilledFields = [
    { label: 'Full Name',   value: `${p.titleEn} ${p.firstNameEn} ${p.lastNameEn}`, key: 'student_name' },
    { label: 'Student ID',  value: p.studentId,   key: 'student_id' },
    { label: 'Email',       value: p.email,       key: 'email' },
    { label: 'Program',     value: p.program,     key: 'program' },
    { label: 'Advisor',     value: p.advisorName, key: 'advisor_name' },
    { label: 'Visa Expiry', value: p.visaExpiry,  key: 'visa_expiry' },
  ].filter(item => allVarTokens.some(v => v.slice(2, -2) === item.key));

  const submitDisabled = hasUserInputFields && !allInputsFilled;

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

        {hasUserInputFields && (
          <SectionCard icon={<RiEditLine size={14} />} title="Additional Information Required"
            subtitle="Please fill in the following fields" color="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userInputKeys.map(key => {
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
export default function NewRequestFormPage({ params }: { params: { typeId: string } }) {
  const { typeId } = params;
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<{ id: number; name: string; description: string } | null>(null);
  const [requiredDocs, setRequiredDocs] = useState<DocTemplate[]>([]);

  useEffect(() => {
    async function loadType() {
      try {
        const res = await requestTypeApi.getAll();
        const rt = res.data.data.find(r => r.id === Number(typeId));
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
      } catch (e) {
        console.error('Failed to load request type:', e);
      } finally {
        setLoading(false);
      }
    }
    loadType();
  }, [typeId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // DEMO: student DB id = 1 (seeded). Replace with auth token lookup in production.
      await requestApi.create({
        studentId: 1,
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
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-blue-400 px-6 py-5">
          <div className="flex items-center gap-3">
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

      {typeId === '1'
        ? <LeaveRequestForm requiredDocs={requiredDocs} onSubmit={handleSubmit} />
        : <DynamicRequestForm typeName={config?.name ?? 'Request'} requiredDocs={requiredDocs} onSubmit={handleSubmit} />
      }

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
