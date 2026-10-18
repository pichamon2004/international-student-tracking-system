'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiAddLine, RiPencilLine, RiImageLine, RiDownloadLine, RiCheckLine, RiCloseCircleLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { studentMeApi, changeRequestApi, passportApi, type ApiPassport, type ApiChangeRequest } from '@/lib/api';
import PendingBanner from '@/components/PendingBanner';
import {
  InfoTile, SectionTitle, ValidityBar, fmtDate, expiryStatus, EXPIRY_STYLE, FIRST_REMINDER_DAYS,
} from '@/components/profile/ProfileUI';

export default function PassportPage() {
  const router = useRouter();
  const [passports, setPassports] = useState<ApiPassport[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<ApiChangeRequest[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [switching, setSwitching] = useState<number | null>(null);

  const load = () => studentMeApi.get()
    .then(async res => {
      const s = res.data.data;
      setStudentId(s.id);
      setPassports(s.passports);
      // Every pending passport request: new passports, edits, and current/inactive switches
      try {
        setPendingChanges((await changeRequestApi.listPendingOfType('PASSPORT', s.id)).data.data);
      } catch { /* banner is optional */ }
    })
    .catch(() => {})
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Only a passport marked current is shown as current — none is picked automatically
  const current = passports.find(p => p.isCurrent) ?? null;
  const others = passports
    .filter(p => p !== current)
    .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());

  const setCurrent = async (passport: ApiPassport, isCurrent: boolean) => {
    if (!studentId) return;
    setSwitching(passport.id);
    try {
      const res = await passportApi.setCurrent(studentId, passport.id, isCurrent);
      if (res.status === 202 && res.data.changeRequest) {
        setPendingChanges(prev => [...prev, res.data.changeRequest!]);
        toast.success('Sent to staff for approval');
      } else {
        toast.success(isCurrent ? 'Current passport updated' : 'Passport set inactive');
        await load();
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Could not change the current passport');
    } finally {
      setSwitching(null);
    }
  };

  const status = current ? expiryStatus(current.expiryDate) : null;
  const style = status ? EXPIRY_STYLE[status] : null;
  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F3F7FD] text-primary hover:bg-primary hover:text-white transition"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-primary flex-1">My Passport</h1>
          <button
            onClick={() => router.push('/student/profile/updatepassport')}
            className="inline-flex items-center gap-1.5 border border-primary text-primary text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/5 transition"
          >
            <RiAddLine size={16} /> Add new passport
          </button>
        </div>

        {pendingChanges.map(cr => {
            const record = passports.find(r => r.id === cr.entityId);
            return (
              <PendingBanner
                key={cr.id}
                pending={cr}
                subject={cr.action === 'CREATE' ? 'new record' : record ? `Passport ${record.passportNumber}` : undefined}
                currentData={record as unknown as Record<string, unknown> | undefined}
                fieldLabels={{ passportNumber: 'Passport No.', issuingCountry: 'Issuing Country', issueDate: 'Date of Issue', expiryDate: 'Expiry Date', placeOfIssue: 'Place of Issue', isCurrent: 'Current passport', imageUrl: 'Passport Image' }}
                onCancel={() => setPendingChanges(prev => prev.filter(p => p.id !== cr.id))}
              />
            );
          })}

        {loading ? (
          <div className="animate-pulse flex flex-col gap-5">
            <div className="h-64 bg-gray-100 rounded-2xl" />
            <div className="h-32 bg-gray-100 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Current passport */}
            <div className="rounded-2xl border border-gray-100 p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <SectionTitle title="Current passport">
                    {style && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${style.badge}`}>{style.label}</span>
                    )}
                  </SectionTitle>
                </div>
                {current && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrent(current, false)}
                      disabled={switching !== null || pendingChanges.length > 0}
                      className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition disabled:opacity-40"
                    >
                      <RiCloseCircleLine size={15} /> Set inactive
                    </button>
                    <button
                      onClick={() => router.push(`/student/profile/updatepassport?id=${current.id}`)}
                      className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition"
                    >
                      <RiPencilLine size={15} /> Edit
                    </button>
                  </div>
                )}
              </div>

              {current ? (
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-5">
                  {/* Scan */}
                  <div className="flex flex-col gap-2">
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-primary/25 bg-[#F3F7FD] flex items-center justify-center overflow-hidden">
                      {current.imageUrl ? (
                        <a href={current.imageUrl} target="_blank" rel="noreferrer" className="w-full h-full">
                          <img src={current.imageUrl} alt="Passport scan" className="w-full h-full object-contain" />
                        </a>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <RiImageLine size={26} />
                          <span className="text-xs">No scan uploaded</span>
                        </div>
                      )}
                    </div>
                    {current.imageUrl && (
                      <a href={current.imageUrl} target="_blank" rel="noreferrer" download
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 w-fit">
                        <RiDownloadLine size={13} /> Download scan
                      </a>
                    )}
                  </div>

                  {/* Details + validity */}
                  <div className="flex flex-col gap-4 min-w-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <InfoTile label="Passport No." value={current.passportNumber} />
                      <InfoTile label="Issuing Country" value={current.issuingCountry} />
                      <InfoTile label="Place of Issue" value={current.placeOfIssue} />
                      <InfoTile label="Date of Issue" value={fmtDate(current.issueDate)} />
                      <InfoTile label="Date of Expiry" value={fmtDate(current.expiryDate)} />
                    </div>

                    <ValidityBar
                      issueDate={current.issueDate}
                      expiryDate={current.expiryDate}
                      note={status === 'expired'
                        ? 'This passport has expired — please add your new passport.'
                        : `We'll remind you ${FIRST_REMINDER_DAYS} days before it expires.`}
                    />
                  </div>
                </div>
              ) : passports.length > 0 ? (
                <div className="flex flex-col items-center gap-1 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-700">No current passport selected</p>
                  <p className="text-xs text-gray-500">Choose the passport you are using now from the list below.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-700">No passport added yet</p>
                  <button
                    onClick={() => router.push('/student/profile/updatepassport')}
                    className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition"
                  >
                    <RiAddLine size={16} /> Add passport
                  </button>
                </div>
              )}
            </div>

            {/* History */}
            <div className="rounded-2xl border border-gray-100 p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <SectionTitle title="Other passports" />
                <p className="text-xs text-gray-500">Set the one you are using now as current</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Passport No.', 'Issuing Country', 'Date of Issue', 'Expiry Date', 'Status', ''].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-primary/70">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {others.length > 0 ? others.map(p => {
                      const st = EXPIRY_STYLE[expiryStatus(p.expiryDate)];
                      return (
                        <tr key={p.id} className="border-b border-gray-50 last:border-none">
                          <td className="py-2.5 px-2 font-medium text-gray-800">{p.passportNumber}</td>
                          <td className="py-2.5 px-2 text-gray-700">{p.issuingCountry}</td>
                          <td className="py-2.5 px-2 text-gray-700">{fmtDate(p.issueDate)}</td>
                          <td className="py-2.5 px-2 text-gray-700">{fmtDate(p.expiryDate)}</td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}>{st.label}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => setCurrent(p, true)}
                              disabled={switching !== null || pendingChanges.length > 0}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary border border-primary/40 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition disabled:opacity-40"
                            >
                              <RiCheckLine size={13} /> {switching === p.id ? 'Saving…' : 'Set as current'}
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center">
                          <p className="text-sm font-semibold text-gray-700">No other passports</p>
                          <p className="text-xs text-gray-500 mt-0.5">When you add a new passport, it becomes current and this one moves here.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
