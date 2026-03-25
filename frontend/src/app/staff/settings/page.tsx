'use client';

import { useState, useEffect, useCallback } from 'react';
import type { IconType } from 'react-icons';
import { templateApi, requestTypeApi, type ApiRequestType } from '@/lib/api';
import { clsx } from 'clsx';
import DocTemplateModal, { DocTemplate, ALL_VARIABLES } from '@/components/DocTemplateModal';
import EmailTemplateModal, { EmailTemplate } from '@/components/EmailTemplateModal';
import {
  RiEditLine, RiDeleteBinLine, RiFileTextLine, RiMailLine, RiAddLine, RiClipboardLine,
  RiCheckLine, RiCloseLine, RiGridLine,
  RiPlaneLine, RiPassportLine, RiHospitalLine, RiGraduationCapLine, RiBuilding2Line,
  RiFileList2Line, RiFileTextLine as RiFileTextLine2, RiFileCopyLine, RiFileUserLine,
  RiUserLine, RiUserSettingsLine, RiGroupLine, RiContactsLine,
  RiHome3Line, RiMapPin2Line, RiGlobalLine, RiBriefcaseLine,
  RiBankLine, RiShieldLine, RiLockLine, RiSettings3Line,
  RiAlertLine, RiInformationLine, RiQuestionLine, RiSendPlaneLine,
  RiHeartPulseLine, RiBookOpenLine, RiCalendarLine, RiExchangeLine,
} from 'react-icons/ri';

type Tab = 'Document Templates' | 'Email Templates' | 'Request Types';
const TABS: Tab[] = ['Document Templates', 'Email Templates', 'Request Types'];

const EMAIL_VARIABLES = [
  '{{student_name}}', '{{student_id}}', '{{email}}',
  '{{visa_expiry_date}}', '{{days_remaining}}', '{{request_type}}',
  '{{status}}', '{{program}}', '{{date}}',
];

/* ─── Icon Picker (react-icons) ───────────────────────────── */
const ICON_MAP: Record<string, IconType> = {
  RiPlaneLine,
  RiPassportLine,
  RiHospitalLine,
  RiGraduationCapLine,
  RiBuilding2Line,
  RiFileList2Line,
  RiFileTextLine2,
  RiFileCopyLine,
  RiFileUserLine,
  RiUserLine,
  RiUserSettingsLine,
  RiGroupLine,
  RiContactsLine,
  RiHome3Line,
  RiMapPin2Line,
  RiGlobalLine,
  RiBriefcaseLine,
  RiBankLine,
  RiShieldLine,
  RiLockLine,
  RiSettings3Line,
  RiAlertLine,
  RiInformationLine,
  RiQuestionLine,
  RiSendPlaneLine,
  RiHeartPulseLine,
  RiBookOpenLine,
  RiCalendarLine,
  RiExchangeLine,
  RiClipboardLine,
};

function IconComponent({ iconKey, size = 18, className }: { iconKey: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[iconKey];
  return Icon ? <Icon size={size} className={className} /> : <RiClipboardLine size={size} className={className} />;
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = value ? ICON_MAP[value] : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:border-primary text-sm transition min-w-[110px]"
      >
        {SelectedIcon
          ? <SelectedIcon size={18} className="text-primary" />
          : <RiGridLine size={18} className="text-gray-400" />}
        <span className="text-gray-500 text-xs">{value ? 'Change icon' : 'Select icon'}</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">Choose an icon</p>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1">
              <RiCloseLine size={13} /> No icon
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {Object.entries(ICON_MAP).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                title={key.replace(/^Ri/, '').replace(/Line$|Fill$/, '')}
                onClick={() => { onChange(key); setOpen(false); }}
                className={clsx(
                  'w-9 h-9 flex items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary transition',
                  value === key ? 'bg-primary/10 text-primary ring-2 ring-primary' : 'text-gray-500'
                )}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


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
function DeleteDialog({ title = 'Delete', name, onConfirm, onCancel }: { title?: string; name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <RiDeleteBinLine size={18} className="text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{title}</p>
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

/* ─── Request Types ──────────────────────────────────────────── */
type RequestType = {
  id: number;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
  requiredDocumentIds: number[];
};

const initialRequestTypes: RequestType[] = [
  { id: 1, name: 'Visa Extension',  icon: 'RiPassportLine',   description: 'ยื่นคำร้องขอต่ออายุวีซ่านักศึกษา', isActive: true,  requiredDocumentIds: [2] },
  { id: 2, name: 'Leave Request',   icon: 'RiPlaneLine',      description: 'ขออนุญาตออกนอกประเทศชั่วคราว',    isActive: true,  requiredDocumentIds: [1, 3] },
  { id: 3, name: 'Name Change',     icon: 'RiFileUserLine',   description: 'ขอเปลี่ยนชื่อ-นามสกุลในระบบ',     isActive: true,  requiredDocumentIds: [] },
  { id: 4, name: 'Address Update',  icon: 'RiHome3Line',      description: 'แจ้งเปลี่ยนที่อยู่ปัจจุบัน',       isActive: false, requiredDocumentIds: [] },
];

type RequestTypeModalProps = {
  item: RequestType | null;
  docTemplates: DocTemplate[];
  onSave: (data: Omit<RequestType, 'id'> & { id?: number }) => void;
  onClose: () => void;
};

function RequestTypeModal({ item, docTemplates, onSave, onClose }: RequestTypeModalProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [icon, setIcon] = useState(item?.icon ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [requiredDocumentIds, setRequiredDocumentIds] = useState<number[]>(item?.requiredDocumentIds ?? []);

  const toggleDoc = (id: number) =>
    setRequiredDocumentIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: item?.id, name: name.trim(), icon, description: description.trim(), isActive, requiredDocumentIds });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DEEBFF] flex items-center justify-center shrink-0">
            {icon
              ? <IconComponent iconKey={icon} size={18} className="text-primary" />
              : <RiClipboardLine size={18} className="text-primary" />}
          </div>
          <h2 className="text-base font-bold text-primary">{item ? 'Edit Request Type' : 'New Request Type'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Icon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Icon <span className="text-gray-400 font-normal">(optional)</span></label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Name <span className="text-red-400">*</span></label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Leave Request"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description shown to students..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
            />
          </div>

          {/* Required Documents */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-600">Required Documents <span className="text-gray-400 font-normal">(student must attach)</span></label>
            {docTemplates.filter(t => t.isActive).length === 0 ? (
              <p className="text-xs text-gray-400 italic">No active document templates available.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {docTemplates.filter(t => t.isActive).map(doc => {
                  const checked = requiredDocumentIds.includes(doc.id);
                  return (
                    <label key={doc.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition">
                      <div
                        onClick={() => toggleDoc(doc.id)}
                        className={clsx(
                          'w-4 h-4 rounded flex items-center justify-center shrink-0 border transition',
                          checked ? 'bg-primary border-primary' : 'border-gray-300 bg-white'
                        )}
                      >
                        {checked && <RiCheckLine size={11} className="text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{doc.name}</p>
                        {doc.description && <p className="text-xs text-gray-400 truncate">{doc.description}</p>}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 pt-1 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setIsActive(v => !v)}
                className={clsx(
                  'relative w-9 h-5 rounded-full transition-colors shrink-0',
                  isActive ? 'bg-primary' : 'bg-gray-200'
                )}>
                <span className={clsx(
                  'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  isActive ? 'translate-x-4' : 'translate-x-0'
                )} />
              </div>
              <span className="text-sm text-gray-700">Active (visible to students)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
              {item ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestTypesTab({
  docTemplates,
  types,
  onRefresh,
}: {
  docTemplates: DocTemplate[];
  types: RequestType[];
  onRefresh: () => void;
}) {
  const [modal, setModal] = useState<null | 'create' | RequestType>(null);
  const [deleteTarget, setDeleteTarget] = useState<RequestType | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Omit<RequestType, 'id'> & { id?: number }) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        description: data.description,
        icon: data.icon,
        isActive: data.isActive,
        documentTemplateIds: data.requiredDocumentIds,
      };
      if (!data.id) {
        await requestTypeApi.create(payload);
      } else {
        await requestTypeApi.update(data.id, payload);
      }
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      setModal(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await requestTypeApi.delete(deleteTarget.id);
      onRefresh();
    } catch (e) { console.error(e); }
    setDeleteTarget(null);
  };

  const handleToggle = async (t: RequestType) => {
    try {
      await requestTypeApi.update(t.id, { isActive: !t.isActive });
      onRefresh();
    } catch (e) { console.error(e); }
  };

  // Map doc id → name for chips
  const docMap = Object.fromEntries(docTemplates.map(d => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">{types.length} type{types.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setModal('create')} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
          <RiAddLine size={16} /> New Request Type
        </button>
      </div>

      {/* Cards */}
      {types.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
          No request types yet. Click <strong>+ New Request Type</strong> to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {types.map(t => (
            <div key={t.id}
              className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all group">
              {/* Icon */}
              <div className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                t.isActive ? 'bg-[#DEEBFF] text-primary' : 'bg-gray-100 text-gray-400'
              )}>
                <IconComponent iconKey={t.icon} size={18} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-primary truncate">{t.name}</p>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.description || '—'}</p>
                {/* Document chips */}
                {t.requiredDocumentIds.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <RiFileTextLine size={12} className="text-gray-400 shrink-0" />
                    {t.requiredDocumentIds.map(docId => (
                      <span key={docId} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                        {docMap[docId] ?? `Doc #${docId}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2 shrink-0 self-start mt-0.5">
                <StatusBadge active={t.isActive} onToggle={() => handleToggle(t)} />
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
        <RequestTypeModal
          item={modal === 'create' ? null : modal}
          docTemplates={docTemplates}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          title="Delete Request Type"
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ─── Helpers: map API → frontend types ─────────────────────── */
function apiToDocTemplate(t: {
  id: number; name: string; description: string | null;
  body: string; variables: string | null; isActive: boolean;
}): DocTemplate {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? '',
    body: t.body,
    isActive: t.isActive,
    variables: t.variables ? (JSON.parse(t.variables) as string[]) : [],
  };
}

function apiToRequestType(t: ApiRequestType): RequestType {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? '',
    icon: t.icon ?? '',
    isActive: t.isActive,
    requiredDocumentIds: t.documentTemplates.map(d => d.id),
  };
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Document Templates');
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | DocTemplate>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocTemplate | null>(null);

  // Load all data from API
  const loadData = useCallback(async () => {
    try {
      const [tmplRes, rtRes] = await Promise.all([
        templateApi.getAll(),
        requestTypeApi.getAll(),
      ]);
      setDocTemplates(tmplRes.data.data.map(apiToDocTemplate));
      setRequestTypes(rtRes.data.data.map(apiToRequestType));
    } catch (e) {
      console.error('Failed to load settings data:', e);
      // Fallback to initial mock data if API unavailable
      setDocTemplates(initialDocTemplates);
      setRequestTypes(initialRequestTypes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Create or update template
  const handleDocSave = async (data: Partial<DocTemplate> & { id?: number }) => {
    try {
      if (!data.id) {
        await templateApi.create({
          name: data.name ?? '',
          description: data.description,
          body: data.body ?? '',
          variables: data.variables ?? [],
          isActive: data.isActive ?? true,
        });
      } else {
        await templateApi.update(data.id, {
          name: data.name,
          description: data.description,
          body: data.body,
          variables: data.variables,
          isActive: data.isActive,
        });
      }
      await loadData();
    } catch (e) { console.error(e); }
    setModal(null);
  };

  const handleDocToggle = async (id: number) => {
    const t = docTemplates.find(d => d.id === id);
    if (!t) return;
    try {
      await templateApi.update(id, { isActive: !t.isActive });
      await loadData();
    } catch (e) { console.error(e); }
  };

  const handleDocDelete = async () => {
    if (!deleteTarget) return;
    try {
      await templateApi.delete(deleteTarget.id);
      await loadData();
    } catch (e) { console.error(e); }
    setDeleteTarget(null);
  };

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage templates and request types used across the system.</p>
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
        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm animate-pulse">Loading…</div>
        ) : (
          <>
            {activeTab === 'Document Templates' && (
              <DocTemplatesTabControlled
                templates={docTemplates}
                modal={modal}
                deleteTarget={deleteTarget}
                onOpenCreate={() => setModal('create')}
                onOpenEdit={t => setModal(t)}
                onToggle={handleDocToggle}
                onSave={handleDocSave}
                onCloseModal={() => setModal(null)}
                onDeleteTarget={setDeleteTarget}
                onDeleteConfirm={handleDocDelete}
                onDeleteCancel={() => setDeleteTarget(null)}
              />
            )}
            {activeTab === 'Email Templates'  && <EmailTemplatesTab />}
            {activeTab === 'Request Types'    && (
              <RequestTypesTab
                docTemplates={docTemplates}
                types={requestTypes}
                onRefresh={loadData}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Controlled Doc Templates Tab (lifted state) ───────────── */
type DocTemplatesTabControlledProps = {
  templates: DocTemplate[];
  modal: null | 'create' | DocTemplate;
  deleteTarget: DocTemplate | null;
  onOpenCreate: () => void;
  onOpenEdit: (t: DocTemplate) => void;
  onToggle: (id: number) => void;
  onSave: (data: Partial<DocTemplate> & { id?: number }) => void;
  onCloseModal: () => void;
  onDeleteTarget: (t: DocTemplate) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
};

function DocTemplatesTabControlled({ templates, modal, deleteTarget, onOpenCreate, onOpenEdit, onToggle, onSave, onCloseModal, onDeleteTarget, onDeleteConfirm, onDeleteCancel }: DocTemplatesTabControlledProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        <button onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
          <RiAddLine size={16} /> New Template
        </button>
      </div>
      {templates.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
          No templates yet. Click <strong>+ New Template</strong> to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(t => (
            <div key={t.id}
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all group">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                t.isActive ? 'bg-[#DEEBFF] text-primary' : 'bg-gray-100 text-gray-400')}>
                <RiFileTextLine size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{t.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.description || '—'}</p>
              </div>
              <StatusBadge active={t.isActive} onToggle={() => onToggle(t.id)} />
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => onOpenEdit(t)} title="Edit"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-primary/10 hover:text-primary transition">
                  <RiEditLine size={15} />
                </button>
                <button onClick={() => onDeleteTarget(t)} title="Delete"
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
          allVariables={ALL_VARIABLES} onSave={onSave} onClose={onCloseModal}
          studentName="Zhang Wei"
          advisorName="Asst. Prof. Dr. Somchai Rakdee"
        />
      )}
      {deleteTarget && (
        <DeleteDialog title="Delete Template" name={deleteTarget.name}
          onConfirm={onDeleteConfirm} onCancel={onDeleteCancel} />
      )}
    </div>
  );
}
