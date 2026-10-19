'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { RiCheckLine, RiCloseLine, RiTimeLine } from 'react-icons/ri';
import { changeRequestApi, type ApiChangeRequest } from '@/lib/api';
import toast from 'react-hot-toast';

const ENTITY_LABELS: Record<string, string> = {
  STUDENT_PROFILE:   'Personal Info',
  DEPENDENT:         'Dependent',
  PASSPORT:          'Passport',
  VISA:              'Visa',
  HEALTH_INSURANCE:  'Health Insurance',
  ACADEMIC_DOCUMENT: 'Academic Document',
};

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  CREATE: { label: 'New Record',  className: 'bg-blue-100 text-blue-700' },
  UPDATE: { label: 'Update',      className: 'bg-amber-100 text-amber-700' },
  DELETE: { label: 'Delete',      className: 'bg-red-100 text-red-700' },
};

// Field names as people read them; anything not listed is spelled out from camelCase
const FIELD_LABELS: Record<string, string> = {
  titleEn: 'Title', firstNameEn: 'First name', middleNameEn: 'Middle name', lastNameEn: 'Last name',
  firstNameTh: 'First name (Thai)', lastNameTh: 'Last name (Thai)',
  dateOfBirth: 'Date of birth', homeAddress: 'Home address', homeCountry: 'Home country',
  thaiAddress: 'Address in Thailand', phone: 'Phone', email: 'Email',
  emergencyContact: 'Emergency contact name', emergencyRelation: 'Emergency contact relation',
  emergencyPhone: 'Emergency contact phone', emergencyEmail: 'Emergency contact email',
  photoUrl: 'Photo', imageUrl: 'Image', fileUrl: 'File', backFileUrl: 'Back of card', pageUrls: 'Pages',
  passportNumber: 'Passport number', passportExpiry: 'Passport expiry', passportImageUrl: 'Passport image',
  issuingCountry: 'Issuing country', issuingPlace: 'Place of issue', issueDate: 'Issue date', expiryDate: 'Expiry date',
  visaType: 'Visa type', visaNumber: 'Visa number', visaExpiry: 'Visa expiry', visaStatus: 'Visa status',
  visaImageUrl: 'Visa image', arrivalImageUrl: 'Arrival stamp', departedImageUrl: 'Departure stamp',
  policyNumber: 'Policy number', coverageType: 'Coverage type', startDate: 'Start date', endDate: 'End date',
};

// Columns that identify the record rather than describe it
const HIDDEN_FIELDS = new Set(['id', 'studentId', 'createdAt', 'updatedAt', 'passportId', 'visaId', 'userId']);

const fieldLabel = (key: string) =>
  FIELD_LABELS[key] ?? key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()).replace(/ (\w)/g, (_, c: string) => ' ' + c.toLowerCase());

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v);
const isUrl = (v: unknown): v is string => typeof v === 'string' && /^(https?:\/\/|\/)/.test(v);

/** URLs a value holds: one file URL, or a JSON list of page URLs */
function urlsOf(v: unknown): string[] | null {
  if (isUrl(v)) return [v];
  if (typeof v === 'string' && v.startsWith('[')) {
    try { const a = JSON.parse(v); if (Array.isArray(a) && a.every(isUrl)) return a; } catch { /* not a list */ }
  }
  return null;
}

/** What two values are compared as: blanks alike, dates by day, file links without their signature */
function normalize(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (isDate(v)) return v.slice(0, 10);
  const urls = urlsOf(v);
  if (urls) return urls.map(u => u.split('?')[0]).join('|');
  return String(v).trim();
}

function FieldValue({ value, tone }: { value: unknown; tone?: 'old' | 'new' }) {
  if (normalize(value) === '') return <span className="text-gray-300">—</span>;
  const cls = tone === 'old' ? 'text-red-500 line-through' : tone === 'new' ? 'text-green-700 font-semibold' : 'text-gray-700';
  const urls = urlsOf(value);
  if (urls) {
    return (
      <span className={clsx('flex flex-wrap gap-x-2', tone === 'old' && 'opacity-70')}>
        {urls.map((u, i) => (
          <a key={i} href={u} target="_blank" rel="noopener noreferrer"
            className={clsx('underline', tone === 'old' ? 'text-red-500' : tone === 'new' ? 'text-green-700 font-semibold' : 'text-primary')}>
            {urls.length > 1 ? `Page ${i + 1}` : 'View file'}
          </a>
        ))}
      </span>
    );
  }
  let text: string;
  if (isDate(value)) {
    text = new Date(value.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (typeof value === 'boolean') {
    text = value ? 'Yes' : 'No';
  } else if (typeof value === 'string' && /^[A-Z][A-Z_]+$/.test(value)) {
    text = value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' '); // MALE → Male
  } else {
    text = String(value);
  }
  return <span className={clsx(cls, 'break-words')}>{text}</span>;
}

const TH = 'text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 py-2';

function PayloadDiff({ payload, current, action }: { payload: Record<string, unknown>; current?: Record<string, unknown> | null; action: string }) {
  // DELETE: show what is about to go
  if (action === 'DELETE') {
    const rows = Object.entries(current ?? {}).filter(([k, v]) => !HIDDEN_FIELDS.has(k) && normalize(v) !== '' && typeof v !== 'object');
    return (
      <div className="mt-3 rounded-xl border border-red-100 overflow-hidden">
        <p className="px-3 py-2 bg-red-50 text-xs text-red-600 font-semibold">This record will be deleted</p>
        {rows.length > 0 && (
          <table className="w-full text-xs">
            <tbody className="divide-y divide-gray-50">
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td className="px-3 py-2 text-gray-500 font-medium w-48">{fieldLabel(k)}</td>
                  <td className="px-3 py-2"><FieldValue value={v} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  const keys = Object.keys(payload).filter(k => !HIDDEN_FIELDS.has(k));
  // CREATE (or the record is gone): nothing to compare against
  if (action === 'CREATE' || !current) {
    const rows = keys.filter(k => normalize(payload[k]) !== '');
    if (rows.length === 0) return null;
    return (
      <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden">
        <p className="px-3 py-2 bg-blue-50 text-xs text-blue-700 font-semibold">
          {action === 'CREATE' ? 'New record' : 'Requested values'}
          {action !== 'CREATE' && <span className="font-normal text-gray-400"> — the current record could not be found</span>}
        </p>
        <table className="w-full text-xs">
          <thead className="bg-gray-50/60"><tr><th className={clsx(TH, 'w-48')}>Field</th><th className={TH}>Value</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(k => (
              <tr key={k}>
                <td className="px-3 py-2 text-gray-500 font-medium">{fieldLabel(k)}</td>
                <td className="px-3 py-2"><FieldValue value={payload[k]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // UPDATE: every field, the changed ones highlighted
  const changed = new Set(keys.filter(k => normalize(payload[k]) !== normalize(current[k])));
  return (
    <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden">
      <p className={clsx('px-3 py-2 text-xs font-semibold', changed.size ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500')}>
        {changed.size
          ? `${changed.size} field${changed.size > 1 ? 's' : ''} changed`
          : 'No differences from the current record'}
      </p>
      <table className="w-full text-xs table-fixed">
        <thead className="bg-gray-50/60">
          <tr>
            <th className={clsx(TH, 'w-[34%]')}>Field</th>
            <th className={clsx(TH, 'w-[33%]')}>Current</th>
            <th className={clsx(TH, 'w-[33%]')}>Requested</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {keys.map(k => {
            const isChanged = changed.has(k);
            return (
              <tr key={k} className={clsx(isChanged && 'bg-amber-50/60')}>
                <td className={clsx('px-3 py-2 font-medium border-l-[3px]', isChanged ? 'border-amber-400 text-gray-800' : 'border-transparent text-gray-500')}>
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    {fieldLabel(k)}
                    {isChanged && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Changed</span>}
                  </span>
                </td>
                <td className="px-3 py-2"><FieldValue value={current[k]} tone={isChanged ? 'old' : undefined} /></td>
                <td className="px-3 py-2"><FieldValue value={payload[k]} tone={isChanged ? 'new' : undefined} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ChangeRequestsPage() {
  const [requests, setRequests] = useState<ApiChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    changeRequestApi.listPending()
      .then(res => setRequests(res.data.data))
      .catch(() => toast.error('Failed to load change requests'))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: number) {
    setProcessing(id);
    try {
      await changeRequestApi.approve(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Change approved and applied');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: number) {
    if (!rejectNote.trim()) { toast.error('Please provide a reason'); return; }
    setProcessing(id);
    try {
      await changeRequestApi.reject(id, rejectNote);
      setRequests(prev => prev.filter(r => r.id !== id));
      setRejectId(null);
      setRejectNote('');
      toast.success('Change rejected');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full flex-1 min-h-0">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-primary text-base">Change Requests</p>
          <span className="text-xs text-gray-400">{loading ? '…' : `${requests.length} pending`}</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 px-6 py-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-gray-400 py-16">
            <RiCheckLine size={32} className="text-green-400" />
            <p>No pending change requests</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {requests.map(cr => {
              const studentName = cr.student
                ? [cr.student.firstNameEn, cr.student.lastNameEn].filter(Boolean).join(' ')
                : `Student #${cr.studentId}`;
              const actionCfg = ACTION_LABELS[cr.action] ?? { label: cr.action, className: 'bg-gray-100 text-gray-600' };
              const date = new Date(cr.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

              return (
                <div key={cr.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <RiTimeLine className="text-amber-500" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm">{studentName}</span>
                          {cr.student?.studentId && (
                            <span className="text-xs text-gray-400">({cr.student.studentId})</span>
                          )}
                          <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', actionCfg.className)}>{actionCfg.label}</span>
                          <span className="text-xs text-gray-500">{ENTITY_LABELS[cr.entityType] ?? cr.entityType}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{date}</p>

                        {expanded === cr.id && (
                          <PayloadDiff payload={cr.payload} current={cr.current} action={cr.action} />
                        )}

                        {rejectId === cr.id && (
                          <div className="mt-3 flex gap-2">
                            <input
                              value={rejectNote}
                              onChange={e => setRejectNote(e.target.value)}
                              placeholder="Reason for rejection…"
                              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                            />
                            <button
                              onClick={() => handleReject(cr.id)}
                              disabled={processing === cr.id}
                              className="px-4 py-2 bg-red-500 text-white text-xs font-medium rounded-xl hover:bg-red-600 transition disabled:opacity-40"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => { setRejectId(null); setRejectNote(''); }}
                              className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-200 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpanded(expanded === cr.id ? null : cr.id)}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        {expanded === cr.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => handleApprove(cr.id)}
                        disabled={processing === cr.id || rejectId === cr.id}
                        className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-xl hover:bg-green-600 transition disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectId(cr.id); setRejectNote(''); setExpanded(cr.id); }}
                        disabled={processing === cr.id}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-200 transition disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
