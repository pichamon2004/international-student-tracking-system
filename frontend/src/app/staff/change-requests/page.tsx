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

function PayloadDiff({ payload, action }: { payload: Record<string, unknown>; action: string }) {
  if (action === 'DELETE') {
    return <p className="text-xs text-red-600 font-medium mt-1">This record will be deleted.</p>;
  }
  const entries = Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-2 text-xs">
          <span className="text-gray-500 font-medium min-w-[120px] shrink-0">{key}:</span>
          <span className="text-gray-800 truncate">{String(val)}</span>
        </div>
      ))}
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
                          <PayloadDiff payload={cr.payload} action={cr.action} />
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
