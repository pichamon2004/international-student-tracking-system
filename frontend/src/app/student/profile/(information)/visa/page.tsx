'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { RiArrowLeftLine, RiAddLine, RiPencilLine, RiDeleteBinLine, RiDownloadLine, RiImageLine } from 'react-icons/ri';
import { studentMeApi, visaApi, changeRequestApi, type ApiVisa, type ApiChangeRequest } from '@/lib/api';
import PendingBanner from '@/components/PendingBanner';
import {
  InfoTile, SectionTitle, SectionCard, ValidityBar, fmtDate,
  expiryStatus, EXPIRY_STYLE, FIRST_REMINDER_DAYS,
} from '@/components/profile/ProfileUI';
import toast from 'react-hot-toast';

// Short hint shown next to the visa type code
const VISA_TYPE_HINT: Record<string, string> = {
  ED: 'Education',
  'Non-ED': 'Non-immigrant',
};

// Entries is free text — add a readable hint for the common values
function entriesHint(entries: string | null): string | null {
  if (!entries) return null;
  const e = entries.trim().toLowerCase();
  if (e === '1' || e.startsWith('s')) return 'Single entry';
  if (e.startsWith('m') || /^\d+$/.test(e)) return 'Multiple entries';
  return null;
}

const DOCUMENTS: { key: 'imageUrl' | 'arrivalImageUrl' | 'departedImageUrl' | 'passportImageUrl'; label: string }[] = [
  { key: 'imageUrl',         label: 'Visa Sticker' },
  { key: 'arrivalImageUrl',  label: 'Arrival Stamp' },
  { key: 'departedImageUrl', label: 'Departure Stamp' },
  { key: 'passportImageUrl', label: 'Passport' },
];

function statusLabel(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function ConfirmRemove({ onConfirm, onCancel, busy }: { onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-800">Remove this visa?</h2>
        <p className="text-sm text-gray-500">The visa and its uploaded documents will be deleted. This can't be undone.</p>
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

export default function VisaPage() {
  const router = useRouter();
  const [visas, setVisas] = useState<ApiVisa[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingChange, setPendingChange] = useState<ApiChangeRequest | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        setStudentId(s.id);
        changeRequestApi.getPendingForEntity('VISA', null, s.id).then(r => setPendingChange(r.data.data)).catch(() => {});
        return visaApi.getAll(s.id);
      })
      .then(res => setVisas(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byExpiryDesc = [...visas].sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());
  const current =
    visas.find(v => v.isCurrent && v.status === 'ACTIVE') ??
    visas.find(v => v.isCurrent) ??
    byExpiryDesc[0] ??
    null;
  const history = byExpiryDesc.filter(v => v !== current);

  const status = current ? expiryStatus(current.expiryDate) : null;
  const style = status ? EXPIRY_STYLE[status] : null;
  const untilIsUrgent = status === 'expiring' || status === 'critical' || status === 'expired';

  async function remove() {
    if (!studentId || !current) return;
    setRemoving(true);
    try {
      const res = await visaApi.delete(studentId, current.id);
      setConfirmRemove(false);
      // Registered students' removals go to staff for approval (202) — the
      // visa stays until then, so show the pending banner instead of hiding it.
      if (res.status === 202) {
        toast.success('Removal submitted — awaiting staff approval');
        changeRequestApi.getPendingForEntity('VISA', null, studentId).then(r => setPendingChange(r.data.data)).catch(() => {});
        return;
      }
      setVisas(prev => prev.filter(v => v.id !== current.id));
      toast.success('Visa removed');
    } catch {
      toast.error('Failed to remove visa');
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
          <h1 className="text-2xl font-semibold text-primary flex-1">My Visa</h1>
          <button
            onClick={() => router.push('/student/profile/updatevisa')}
            className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            <RiAddLine size={16} /> Add new visa
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 -mr-2 pr-2">
        {pendingChange && (
          <PendingBanner
            pending={pendingChange}
            fieldLabels={{ visaType: 'Visa Type', issuingCountry: 'Issuing Country', issueDate: 'Issue Date', expiryDate: 'Expiry Date', entries: 'Entries', remarks: 'Remarks' }}
            onCancel={() => setPendingChange(null)}
          />
        )}

        {loading ? (
          <div className="animate-pulse flex flex-col gap-5">
            <div className="h-80 bg-gray-100 rounded-2xl" />
            <div className="h-32 bg-gray-100 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Current visa */}
            <SectionCard>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1">
                  <SectionTitle title="Current visa">
                    {style && <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${style.badge}`}>{style.label}</span>}
                  </SectionTitle>
                </div>
                {current && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/student/profile/updatevisa?id=${current.id}`)}
                      className="inline-flex items-center gap-1.5 border border-primary text-primary text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/5 transition"
                    >
                      <RiPencilLine size={15} /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmRemove(true)}
                      className="inline-flex items-center gap-1.5 border border-red-300 text-red-500 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition"
                    >
                      <RiDeleteBinLine size={15} /> Remove
                    </button>
                  </div>
                )}
              </div>

              {current ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <InfoTile label="Visa No." value={current.visaNumber || <span className="text-gray-400">Not provided</span>} />
                    <InfoTile label="Visa Type" value={
                      <>{current.visaType}{VISA_TYPE_HINT[current.visaType] && <span className="ml-1.5 text-xs font-normal text-gray-500">{VISA_TYPE_HINT[current.visaType]}</span>}</>
                    } />
                    <InfoTile label="Status" value={statusLabel(current.status)} />
                    <InfoTile label="Issuing Country" value={current.issuingCountry} />
                    <InfoTile label="Place of Issue" value={current.issuingPlace} />
                    <InfoTile label="Number of Entries" value={
                      current.entries
                        ? <>{current.entries}{entriesHint(current.entries) && <span className="ml-1.5 text-xs font-normal text-gray-500">{entriesHint(current.entries)}</span>}</>
                        : null
                    } />
                    <InfoTile label="Valid From" value={fmtDate(current.issueDate)} />
                    <InfoTile label="Valid Until" value={fmtDate(current.expiryDate)} tone={untilIsUrgent ? 'danger' : 'default'} />
                    {current.remarks && <InfoTile label="Remarks" value={current.remarks} className="col-span-2" />}
                  </div>

                  <ValidityBar
                    issueDate={current.issueDate}
                    expiryDate={current.expiryDate}
                    note={status === 'expired'
                      ? 'This visa has expired — please add your new visa or extension.'
                      : status === 'valid' ? `We'll remind you ${FIRST_REMINDER_DAYS} days before it expires.` : undefined}
                  />

                  <hr className="border-gray-100" />

                  {/* Documents */}
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-semibold text-gray-700">Documents</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {DOCUMENTS.map(({ key, label }) => {
                        const url = current[key];
                        return (
                          <div key={key} className="flex flex-col gap-2 min-w-0">
                            <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-primary/25 bg-[#F3F7FD] flex items-center justify-center overflow-hidden">
                              {url ? (
                                <a href={url} target="_blank" rel="noreferrer" className="w-full h-full">
                                  <img src={url} alt={label} className="w-full h-full object-contain" />
                                </a>
                              ) : (
                                <div className="flex flex-col items-center gap-1.5 text-gray-400">
                                  <RiImageLine size={22} />
                                  <span className="text-[11px]">Not uploaded</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-700 truncate">{label}</span>
                              {url && (
                                <a href={url} target="_blank" rel="noreferrer" download title={`Download ${label}`}
                                  className="w-7 h-7 shrink-0 rounded-lg bg-[#F3F7FD] text-primary flex items-center justify-center hover:bg-primary hover:text-white transition">
                                  <RiDownloadLine size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-700">No visa added yet</p>
                  <button
                    onClick={() => router.push('/student/profile/updatevisa')}
                    className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition"
                  >
                    <RiAddLine size={16} /> Add visa
                  </button>
                </div>
              )}
            </SectionCard>

            {/* History */}
            <SectionCard>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <SectionTitle title="Visa history" />
                <p className="text-xs text-gray-500">Previous visas and extensions are kept for your records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Visa Type', 'Issuing Country', 'Valid From', 'Valid Until', 'Entries', 'Status'].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-primary/70">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.length > 0 ? history.map(v => {
                      const st = EXPIRY_STYLE[expiryStatus(v.expiryDate)];
                      const label = v.status !== 'ACTIVE' ? statusLabel(v.status) : st.label;
                      const badge = v.status !== 'ACTIVE' ? 'bg-gray-100 text-gray-500' : st.badge;
                      return (
                        <tr key={v.id} className="border-b border-gray-50 last:border-none">
                          <td className="py-2.5 px-2 font-medium text-gray-800">{v.visaType}</td>
                          <td className="py-2.5 px-2 text-gray-700">{v.issuingCountry}</td>
                          <td className="py-2.5 px-2 text-gray-700">{fmtDate(v.issueDate)}</td>
                          <td className="py-2.5 px-2 text-gray-700">{fmtDate(v.expiryDate)}</td>
                          <td className="py-2.5 px-2 text-gray-700">{v.entries || '—'}</td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge}`}>{label}</span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center">
                          <p className="text-sm font-semibold text-gray-700">No previous visas</p>
                          <p className="text-xs text-gray-500 mt-0.5">When you add a new visa or extension, this one will move here.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        )}
        </div>
      </div>

      {confirmRemove && <ConfirmRemove busy={removing} onConfirm={remove} onCancel={() => setConfirmRemove(false)} />}
    </div>
  );
}
