'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import DocTemplateModal, { DocTemplate, ALL_VARIABLES } from '@/components/DocTemplateModal';
import EmailTemplateModal, { EmailTemplate } from '@/components/EmailTemplateModal';
import { RiEditLine, RiDeleteBinLine, RiFileTextLine, RiMailLine, RiAddLine } from 'react-icons/ri';

type Tab = 'Document Templates' | 'Email Templates';
const TABS: Tab[] = ['Document Templates', 'Email Templates'];

const EMAIL_VARIABLES = [
  '{{student_name}}', '{{student_id}}', '{{email}}',
  '{{visa_expiry_date}}', '{{days_remaining}}', '{{request_type}}',
  '{{status}}', '{{program}}', '{{date}}',
];

/* ─── Mock data ─────────────────────────────────────────────── */
const initialDocTemplates: DocTemplate[] = [
  {
    id: 1, name: 'Leave Request Form', description: 'แบบฟอร์มขอออกนอกประเทศ (CP KKU)',
    isActive: true,
    variables: ['{{student_name}}', '{{student_id}}', '{{student_title}}', '{{thai_tel}}', '{{email}}',
      '{{education_level}}', '{{funding_type}}', '{{scholarship_name}}', '{{program}}',
      '{{destination}}', '{{purpose}}', '{{duration_days}}', '{{leave_start}}', '{{leave_end}}',
      '{{visa_expiry}}', '{{advisor_name}}', '{{date}}'],
    body: `Dear Dean of the College of Computing,

I am ({{student_title}}) {{student_name}} Student ID no. {{student_id}}
Thai Tel. no. {{thai_tel}} E-mail {{email}}
Education Level: {{education_level}}
I am a {{funding_type}} ({{scholarship_name}}) student in {{program}} program at the College of Computing, Khon Kaen University.

I would like to temporarily leave Thailand to visit {{destination}} for:
{{purpose}}

Duration of leave is {{duration_days}} starting from {{leave_start}} to {{leave_end}}
My visa expires in {{visa_expiry}}, and I already applied for a re-entry permit.

Student Signature: {{student_name}}
Date: {{date}}`,
  },
  {
    id: 2, name: 'Enrollment Certificate', description: 'หนังสือรับรองการเป็นนักศึกษา',
    isActive: true,
    variables: ['{{student_name}}', '{{student_id}}', '{{program}}', '{{date}}'],
    body: `This is to certify that {{student_name}} (Student ID: {{student_id}}) is currently enrolled in the {{program}} program at the College of Computing, Khon Kaen University.\n\nIssued on: {{date}}`,
  },
  {
    id: 3, name: 'Travel Letter', description: 'หนังสือรับรองการเดินทาง',
    isActive: false,
    variables: ['{{student_name}}', '{{destination}}', '{{date}}'],
    body: `This letter is to confirm that {{student_name}} has been granted permission to travel to {{destination}}.\n\nIssued on: {{date}}`,
  },
];

const initialEmailTemplates: EmailTemplate[] = [
  {
    id: 1, name: 'Visa Expiry Warning',
    subject: 'แจ้งเตือน: วีซ่าของคุณใกล้หมดอายุ',
    isActive: true,
    variables: ['{{student_name}}', '{{visa_expiry_date}}', '{{days_remaining}}'],
    body: 'เรียน {{student_name}},\n\nวีซ่าของท่านจะหมดอายุในอีก {{days_remaining}} วัน ({{visa_expiry_date}}) กรุณาต่อวีซ่าโดยด่วน...',
  },
  {
    id: 2, name: 'Registration Approved',
    subject: 'ยืนยัน: การลงทะเบียนของคุณได้รับการอนุมัติ',
    isActive: true,
    variables: ['{{student_name}}', '{{student_id}}'],
    body: 'เรียน {{student_name}},\n\nการลงทะเบียนรหัส {{student_id}} ได้รับการอนุมัติแล้ว...',
  },
  {
    id: 3, name: 'Request Update',
    subject: 'อัปเดต: สถานะคำร้องของคุณ',
    isActive: true,
    variables: ['{{student_name}}', '{{request_type}}', '{{status}}'],
    body: 'เรียน {{student_name}},\n\nคำร้อง {{request_type}} ของท่านมีการอัปเดตสถานะเป็น {{status}}...',
  },
];

/* ─── Status badge ───────────────────────────────────────────── */
function StatusBadge({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
        active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', active ? 'bg-green-500' : 'bg-gray-400')} />
      {active ? 'Active' : 'Inactive'}
    </button>
  );
}

/* ─── Delete confirm dialog ──────────────────────────────────── */
function DeleteDialog({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <RiDeleteBinLine size={18} className="text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Delete Template</p>
            <p className="text-sm text-gray-500 mt-0.5">Are you sure you want to delete <strong>&ldquo;{name}&rdquo;</strong>? This cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Doc Templates Tab ──────────────────────────────────────── */
function DocTemplatesTab() {
  const [templates, setTemplates] = useState<DocTemplate[]>(initialDocTemplates);
  const [modal, setModal] = useState<null | 'create' | DocTemplate>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocTemplate | null>(null);

  const handleSave = (data: Partial<DocTemplate> & { id?: number }) => {
    if (modal === 'create' || !data.id) {
      const newId = Math.max(0, ...templates.map(t => t.id)) + 1;
      setTemplates(prev => [...prev, { id: newId, name: data.name ?? '', description: data.description ?? '', isActive: data.isActive ?? true, variables: data.variables ?? [], body: data.body ?? '' }]);
    } else {
      setTemplates(prev => prev.map(t => t.id === data.id ? { ...t, ...data } as DocTemplate : t));
    }
    setModal(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
          <RiAddLine size={16} /> New Template
        </button>
      </div>

      {/* Cards */}
      {templates.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
          No templates yet. Click <strong>+ New Template</strong> to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(t => (
            <div key={t.id}
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all group">
              {/* Icon */}
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                t.isActive ? 'bg-[#DEEBFF] text-primary' : 'bg-gray-100 text-gray-400')}>
                <RiFileTextLine size={18} />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{t.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.description || '—'}</p>
              </div>
              {/* Status */}
              <StatusBadge
                active={t.isActive}
                onToggle={() => setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x))}
              />
              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setModal(t)} title="Edit"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-primary/10 hover:text-primary transition">
                  <RiEditLine size={15} />
                </button>
                <button onClick={() => setDeleteTarget(t)} title="Delete"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                  <RiDeleteBinLine size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <DocTemplateModal template={modal === 'create' ? null : modal} isCreate={modal === 'create'}
          allVariables={ALL_VARIABLES} onSave={handleSave} onClose={() => setModal(null)}
          studentName="Zhang Wei"
          advisorName="Asst. Prof. Dr. Somchai Rakdee"
        />
      )}
      {deleteTarget && (
        <DeleteDialog name={deleteTarget.name}
          onConfirm={() => { setTemplates(prev => prev.filter(t => t.id !== deleteTarget!.id)); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

/* ─── Email Templates Tab ────────────────────────────────────── */
function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialEmailTemplates);
  const [modal, setModal] = useState<null | 'create' | EmailTemplate>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  const handleSave = (data: Partial<EmailTemplate> & { id?: number }) => {
    if (modal === 'create' || !data.id) {
      const newId = Math.max(0, ...templates.map(t => t.id)) + 1;
      setTemplates(prev => [...prev, { id: newId, name: data.name ?? '', subject: data.subject ?? '', isActive: data.isActive ?? true, variables: data.variables ?? [], body: data.body ?? '' }]);
    } else {
      setTemplates(prev => prev.map(t => t.id === data.id ? { ...t, ...data } as EmailTemplate : t));
    }
    setModal(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
          <RiAddLine size={16} /> New Template
        </button>
      </div>

      {/* Cards */}
      {templates.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
          No templates yet. Click <strong>+ New Template</strong> to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(t => (
            <div key={t.id}
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all group">
              {/* Icon */}
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                t.isActive ? 'bg-[#DEEBFF] text-primary' : 'bg-gray-100 text-gray-400')}>
                <RiMailLine size={18} />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{t.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.subject}</p>
              </div>
              {/* Status */}
              <StatusBadge
                active={t.isActive}
                onToggle={() => setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x))}
              />
              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setModal(t)} title="Edit"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-primary/10 hover:text-primary transition">
                  <RiEditLine size={15} />
                </button>
                <button onClick={() => setDeleteTarget(t)} title="Delete"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                  <RiDeleteBinLine size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <EmailTemplateModal template={modal === 'create' ? null : modal} isCreate={modal === 'create'}
          allVariables={EMAIL_VARIABLES} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {deleteTarget && (
        <DeleteDialog name={deleteTarget.name}
          onConfirm={() => { setTemplates(prev => prev.filter(t => t.id !== deleteTarget!.id)); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Document Templates');

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage document and email templates used across the system.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-1 border-b border-[#DEEBFF]">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all duration-200 whitespace-nowrap',
              activeTab === tab
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-400 hover:text-primary'
            )}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'Document Templates' && <DocTemplatesTab />}
        {activeTab === 'Email Templates'    && <EmailTemplatesTab />}
      </div>
    </div>
  );
}
