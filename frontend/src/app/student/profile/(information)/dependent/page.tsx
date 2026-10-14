'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { RiArrowLeftLine, RiAddLine, RiPencilLine, RiDeleteBinLine, RiEyeLine, RiCloseLine, RiImageLine } from 'react-icons/ri';
import { studentMeApi, dependentApi, changeRequestApi, type ApiDependent, type ApiChangeRequest } from '@/lib/api';
import PendingBanner from '@/components/PendingBanner';
import { setProgressField } from '@/lib/progressStore';
import {
  InfoTile, SectionTitle, fmtDate, daysRemaining, expiryStatus, EXPIRY_STYLE, FIRST_REMINDER_DAYS, type ExpiryStatus,
} from '@/components/profile/ProfileUI';
import toast from 'react-hot-toast';

const fullName = (d: ApiDependent) => [d.title, d.firstName, d.middleName, d.lastName].filter(Boolean).join(' ');

// Card tint per visa status — expiring/expired visas stand out in the list
const CARD_TONE: Record<ExpiryStatus, string> = {
  valid:    'border-gray-100 bg-white',
  expiring: 'border-amber-200 bg-amber-50/40',
  critical: 'border-red-200 bg-red-50/50',
  expired:  'border-gray-200 bg-gray-50',
};
const VISA_BADGE: Record<ExpiryStatus, string> = {
  valid: 'Visa valid', expiring: 'Visa expiring', critical: 'Visa expiring', expired: 'Visa expired',
};

function DependentModal({ dep, onClose }: { dep: ApiDependent; onClose: () => void }) {
  const IMAGE_SLOTS = [
    { key: 'visaImageUrl' as const,     label: 'Visa sticker' },
    { key: 'arrivalImageUrl' as const,  label: 'Arrival stamp' },
    { key: 'departedImageUrl' as const, label: 'Departure stamp' },
    { key: 'passportImageUrl' as const, label: 'Passport' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold shrink-0">
            {dep.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">{fullName(dep)}</h2>
            <p className="text-xs text-gray-500">{dep.relationship} · {dep.nationality}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F3F7FD] text-primary hover:bg-primary hover:text-white transition">
            <RiCloseLine size={16} />
          </button>
        </div>

        <SectionTitle title="Personal" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoTile label="Relationship" value={dep.relationship} />
          <InfoTile label="Gender" value={dep.gender} />
          <InfoTile label="Date of Birth" value={fmtDate(dep.dateOfBirth)} />
          <InfoTile label="Nationality" value={dep.nationality} />
          <InfoTile label="Email" value={dep.email} className="col-span-2" />
          <InfoTile label="Phone No." value={dep.phone} className="col-span-2" />
        </div>

        <SectionTitle title="Passport & visa" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoTile label="Passport No." value={dep.passportNumber} />
          <InfoTile label="Passport Expiry" value={fmtDate(dep.passportExpiry)} />
          <InfoTile label="Visa Type" value={dep.visaType} />
          <InfoTile
            label="Visa Expiry"
            value={fmtDate(dep.visaExpiry)}
            tone={dep.visaExpiry && expiryStatus(dep.visaExpiry) !== 'valid' ? 'danger' : 'default'}
          />
        </div>

        <SectionTitle title="Documents" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {IMAGE_SLOTS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1.5 min-w-0">
              <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-primary/25 bg-[#F3F7FD] flex items-center justify-center overflow-hidden">
                {dep[key] ? (
                  <a href={dep[key]!} target="_blank" rel="noreferrer" className="w-full h-full">
                    <img src={dep[key]!} alt={label} className="w-full h-full object-contain" />
                  </a>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <RiImageLine size={20} />
                    <span className="text-[11px]">Not uploaded</span>
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ConfirmRemove({ dep, busy, onConfirm, onCancel }: {
  dep: ApiDependent; busy: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-800">Remove this dependent?</h2>
        <p className="text-sm text-gray-500">
          <strong className="text-gray-700">{fullName(dep)}</strong> and their documents will be removed. This can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
          <button onClick={onConfirm} disabled={busy}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50">
            {busy ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function DependentPage() {
  const router = useRouter();
  const [dependents, setDependents] = useState<ApiDependent[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ApiDependent | null>(null);
  const [toRemove, setToRemove] = useState<ApiDependent | null>(null);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingChange, setPendingChange] = useState<ApiChangeRequest | null>(null);

  const loadPending = (sid: number) =>
    changeRequestApi.getPendingForEntity('DEPENDENT', null, sid).then(r => setPendingChange(r.data.data)).catch(() => {});

  useEffect(() => {
    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        setStudentId(s.id);
        loadPending(s.id);
        return dependentApi.getAll(s.id);
      })
      .then(res => setDependents(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function confirmRemove() {
    if (!studentId || !toRemove) return;
    setRemoving(true);
    try {
      const res = await dependentApi.delete(studentId, toRemove.id);
      // Registered students' removals go to staff for approval (202)
      if (res.status === 202) {
        toast.success('Removal submitted — awaiting staff approval');
        loadPending(studentId);
      } else {
        setDependents(prev => prev.filter(d => d.id !== toRemove.id));
        toast.success('Dependent removed');
      }
      setToRemove(null);
    } catch {
      toast.error('Failed to remove dependent');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* The card keeps its size; only the content below the header scrolls */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F3F7FD] text-primary hover:bg-primary hover:text-white transition"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-primary flex-1">My Dependents</h1>
          <button
            onClick={() => router.push('/student/profile/updatedependent')}
            className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            <RiAddLine size={16} /> Add dependent
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 -mr-2 pr-2">
          {pendingChange && (
            <PendingBanner
              pending={pendingChange}
              fieldLabels={{ firstName: 'First Name', lastName: 'Last Name', relationship: 'Relationship', nationality: 'Nationality', dateOfBirth: 'Date of Birth', gender: 'Gender', email: 'Email', phone: 'Phone No.' }}
              onCancel={() => setPendingChange(null)}
            />
          )}

          <div className="rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <SectionTitle title="Family members">
                {!loading && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#DEEBFF] text-primary text-[11px] font-semibold">
                    {dependents.length} {dependents.length === 1 ? 'person' : 'people'}
                  </span>
                )}
              </SectionTitle>
              <p className="text-xs text-gray-500">Spouse or children staying in Thailand on your visa</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
                {[0, 1].map(i => <div key={i} className="h-44 bg-gray-100 rounded-2xl" />)}
              </div>
            ) : dependents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm font-semibold text-gray-700">No dependents added</p>
                <p className="text-xs text-gray-500">Add a spouse or child staying in Thailand with you, or let us know you have none.</p>
                <button
                  onClick={() => {
                    setProgressField('dependentCompleted', true);
                    toast.success('Marked as no dependents');
                    router.back();
                  }}
                  className="text-sm text-gray-600 border border-gray-300 px-5 py-2 rounded-xl hover:border-primary hover:text-primary transition"
                >
                  I have no dependents
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {dependents.map(dep => {
                  const status = dep.visaExpiry ? expiryStatus(dep.visaExpiry) : null;
                  const style = status ? EXPIRY_STYLE[status] : null;
                  const days = dep.visaExpiry ? daysRemaining(dep.visaExpiry) : 0;
                  // No visa start date is stored for dependents, so the bar shows days left
                  // within the reminder window: full until reminders start, then shrinking.
                  const pct = Math.max(0, Math.min(100, (days / FIRST_REMINDER_DAYS) * 100));
                  return (
                    <div key={dep.id} className={`rounded-2xl border p-4 flex flex-col gap-3 min-w-0 ${status ? CARD_TONE[status] : 'border-gray-100 bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold shrink-0">
                          {dep.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate" title={fullName(dep)}>{fullName(dep)}</p>
                          <p className="text-xs text-gray-500 truncate">{dep.relationship} · {dep.nationality}</p>
                        </div>
                        {status && style && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${style.badge}`}>{VISA_BADGE[status]}</span>
                        )}
                      </div>

                      <div className="rounded-xl bg-white border border-gray-100 px-3 py-2.5 flex flex-col gap-1.5">
                        {dep.visaExpiry && style ? (
                          <>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-primary">Visa expires <strong className="text-gray-800">{fmtDate(dep.visaExpiry)}</strong></span>
                              <span className={`font-semibold ${style.text}`}>
                                {status === 'expired' ? 'Expired' : `${days} day${days === 1 ? '' : 's'} left`}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">No visa details yet</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(dep)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-primary/40 bg-white text-primary text-xs font-semibold hover:bg-primary/5 transition">
                          <RiEyeLine size={14} /> View details
                        </button>
                        <button onClick={() => router.push(`/student/profile/updatedependent?id=${dep.id}`)} title="Edit"
                          className="w-9 h-9 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-500 flex items-center justify-center hover:text-primary transition">
                          <RiPencilLine size={14} />
                        </button>
                        <button onClick={() => setToRemove(dep)} title="Remove"
                          className="w-9 h-9 shrink-0 rounded-lg border border-red-200 bg-white text-red-500 flex items-center justify-center hover:bg-red-50 transition">
                          <RiDeleteBinLine size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && <DependentModal dep={selected} onClose={() => setSelected(null)} />}
      {toRemove && <ConfirmRemove dep={toRemove} busy={removing} onConfirm={confirmRemove} onCancel={() => setToRemove(null)} />}
    </div>
  );
}
