'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import DocTemplateModal, { DocTemplate, ALL_VARIABLES } from '@/components/DocTemplateModal';
import EmailTemplateModal, { EmailTemplate } from '@/components/EmailTemplateModal';
import { RiEditLine, RiDeleteBinLine } from 'react-icons/ri';

type Tab = 'Document Templates' | 'Email Templates';
const TABS: Tab[] = ['Document Templates', 'Email Templates'];

/* ─── Variable labels (shared thin version for table chips) ─── */
const VARIABLE_LABELS: Record<string, string> = {
  '{{student_name}}':       'Student Name',
  '{{student_id}}':         'Student ID',
  '{{student_title}}':      'Title',
  '{{thai_tel}}':           'Thai Tel.',
  '{{email}}':              'Email',
  '{{education_level}}':    'Education Level',
  '{{funding_type}}':       'Funding Type',
  '{{scholarship_name}}':   'Scholarship',
  '{{program}}':            'Program',
  '{{destination}}':        'Destination',
  '{{purpose}}':            'Purpose',
  '{{duration_days}}':      'Duration',
  '{{leave_start}}':        'Leave Start',
  '{{leave_end}}':          'Leave End',
  '{{visa_expiry}}':        'Visa Expiry',
  '{{advisor_name}}':       'Advisor',
  '{{date}}':               'Date',
  '{{visa_expiry_date}}':   'Visa Expiry Date',
  '{{days_remaining}}':     'Days Remaining',
  '{{request_type}}':       'Request Type',
  '{{status}}':             'Status',
  '{{dean_name}}':          'Dean Name',
};
function varLabel(v: string) {
  return VARIABLE_LABELS[v] ?? v.replace(/[{}]/g, '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

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
    body: `This is to certify that {{student_name}} (Student ID: {{student_id}}) is currently enrolled in the {{program}} program at the College of Computing, Khon Kaen University.

Issued on: {{date}}`,
  },
  {
    id: 3, name: 'Travel Letter', description: 'หนังสือรับรองการเดินทาง',
    isActive: false,
    variables: ['{{student_name}}', '{{destination}}', '{{date}}'],
    body: `This letter is to confirm that {{student_name}} has been granted permission to travel to {{destination}}.

Issued on: {{date}}`,
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

/* ────────────────────────────────────────────────────────────── */
/* Toggle switch helper */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="inline-flex items-center gap-2">
      <div className={clsx('relative w-9 h-5 rounded-full transition-colors duration-200', checked ? 'bg-green-500' : 'bg-gray-300')}>
        <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200', checked ? 'left-[18px]' : 'left-0.5')} />
      </div>
      <span className={clsx('text-xs font-medium', checked ? 'text-green-600' : 'text-gray-400')}>{checked ? 'Active' : 'Inactive'}</span>
    </button>
  );
}

/* ── Delete confirm dialog ── */
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

/* ──────────────────────────────────────────────────────────── */
/* Doc Templates Tab                                           */
/* ──────────────────────────────────────────────────────────── */
function DocTemplatesTab() {
  const [templates, setTemplates] = useState<DocTemplate[]>(initialDocTemplates);

  // Modal state: null=closed, 'create'=new, DocTemplate=editing
  const [modal, setModal] = useState<null | 'create' | DocTemplate>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocTemplate | null>(null);

  const handleSave = (data: Partial<DocTemplate> & { id?: number }) => {
    if (modal === 'create' || !data.id) {
      const newId = Math.max(0, ...templates.map(t => t.id)) + 1;
      setTemplates(prev => [...prev, {
        id: newId,
        name: data.name ?? '',
        description: data.description ?? '',
        isActive: data.isActive ?? true,
        variables: data.variables ?? [],
        body: data.body ?? '',
      }]);
    } else {
      setTemplates(prev => prev.map(t => t.id === data.id ? { ...t, ...data } as DocTemplate : t));
    }
    setModal(null);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <p className="text-xs text-gray-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-all duration-200"
        >
          <span className="text-base leading-none">+</span>
          New Template
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-4 px-4 font-semibold text-primary">Template Name</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">Description</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">Variables</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Status</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Action</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                  No templates yet. Click <strong>+ New Template</strong> to create one.
                </td>
              </tr>
            )}
            {templates.map(t => (
              <tr key={t.id} className="border-b hover:bg-gray-50 transition">
                <td className="py-3 px-4 text-primary font-medium">{t.name}</td>
                <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">{t.description || '—'}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {t.variables.slice(0, 4).map(v => (
                      <span key={v} title={v} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">{varLabel(v)}</span>
                    ))}
                    {t.variables.length > 4 && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs">+{t.variables.length - 4} more</span>
                    )}
                    {t.variables.length === 0 && <span className="text-xs text-gray-400 italic">none</span>}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <Toggle
                    checked={t.isActive}
                    onChange={() => setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x))}
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setModal(t)}
                      title="Edit template"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
                    >
                      <RiEditLine size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      title="Delete template"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      <RiDeleteBinLine size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Doc Template Modal */}
      {modal !== null && (
        <DocTemplateModal
          template={modal === 'create' ? null : modal}
          isCreate={modal === 'create'}
          allVariables={ALL_VARIABLES}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteDialog
          name={deleteTarget.name}
          onConfirm={() => { setTemplates(prev => prev.filter(t => t.id !== deleteTarget!.id)); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Email Templates Tab                                         */
/* ──────────────────────────────────────────────────────────── */
function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialEmailTemplates);
  const [modal, setModal] = useState<null | 'create' | EmailTemplate>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  const handleSave = (data: Partial<EmailTemplate> & { id?: number }) => {
    if (modal === 'create' || !data.id) {
      const newId = Math.max(0, ...templates.map(t => t.id)) + 1;
      setTemplates(prev => [...prev, {
        id: newId,
        name: data.name ?? '',
        subject: data.subject ?? '',
        isActive: data.isActive ?? true,
        variables: data.variables ?? [],
        body: data.body ?? '',
      }]);
    } else {
      setTemplates(prev => prev.map(t => t.id === data.id ? { ...t, ...data } as EmailTemplate : t));
    }
    setModal(null);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <p className="text-xs text-gray-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-all duration-200"
        >
          <span className="text-base leading-none">+</span>
          New Template
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-4 px-4 font-semibold text-primary">Template Name</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">Subject</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">Variables</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Status</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Action</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                  No templates yet. Click <strong>+ New Template</strong> to create one.
                </td>
              </tr>
            )}
            {templates.map(t => (
              <tr key={t.id} className="border-b hover:bg-gray-50 transition">
                <td className="py-3 px-4 text-primary font-medium">{t.name}</td>
                <td className="py-3 px-4 text-gray-500 max-w-[220px] truncate">{t.subject}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {t.variables.map(v => (
                      <span key={v} title={v} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">{varLabel(v)}</span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <Toggle
                    checked={t.isActive}
                    onChange={() => setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x))}
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setModal(t)}
                      title="Edit template"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
                    >
                      <RiEditLine size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      title="Delete template"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      <RiDeleteBinLine size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Email Template Modal */}
      {modal !== null && (
        <EmailTemplateModal
          template={modal === 'create' ? null : modal}
          isCreate={modal === 'create'}
          allVariables={EMAIL_VARIABLES}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteDialog
          name={deleteTarget.name}
          onConfirm={() => { setTemplates(prev => prev.filter(t => t.id !== deleteTarget!.id)); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Main Page                                                   */
/* ──────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Document Templates');

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-primary">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage document and email templates used across the system.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-1">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-3 py-2 rounded-t-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-primary'
            )}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'Document Templates' && <DocTemplatesTab />}
        {activeTab === 'Email Templates' && <EmailTemplatesTab />}
      </div>
    </div>
  );
}
