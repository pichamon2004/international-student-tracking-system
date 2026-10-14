'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiAddLine, RiPencilLine, RiBankCardLine, RiDownloadLine } from 'react-icons/ri';
import { studentMeApi, healthInsuranceApi, changeRequestApi, type ApiHealthInsurance, type ApiChangeRequest } from '@/lib/api';
import PendingBanner from '@/components/PendingBanner';
import {
  InfoTile, SectionTitle, SectionCard, ValidityBar, fmtDate, expiryStatus, EXPIRY_STYLE,
} from '@/components/profile/ProfileUI';

export default function HealthInsurancePage() {
  const router = useRouter();
  const [insurances, setInsurances] = useState<ApiHealthInsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChange, setPendingChange] = useState<ApiChangeRequest | null>(null);

  useEffect(() => {
    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        changeRequestApi.getPendingForEntity('HEALTH_INSURANCE', null, s.id).then(r => setPendingChange(r.data.data)).catch(() => {});
        return healthInsuranceApi.getAll(s.id);
      })
      .then(res => setInsurances(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byExpiryDesc = [...insurances].sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());
  const current = insurances.find(i => i.isCurrent) ?? byExpiryDesc[0] ?? null;
  const history = byExpiryDesc.filter(i => i !== current);

  const status = current ? expiryStatus(current.expiryDate) : null;
  const style = status ? EXPIRY_STYLE[status] : null;
  const untilIsUrgent = status === 'expiring' || status === 'critical' || status === 'expired';

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
          <h1 className="text-2xl font-semibold text-primary flex-1">My Health Insurance</h1>
          <button
            onClick={() => router.push('/student/profile/updatehealth-insurance')}
            className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            <RiAddLine size={16} /> Add new policy
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 -mr-2 pr-2">
          {pendingChange && (
            <PendingBanner
              pending={pendingChange}
              fieldLabels={{ provider: 'Provider', policyNumber: 'Policy Number', coverageType: 'Coverage Type', startDate: 'Start Date', expiryDate: 'Expiry Date' }}
              onCancel={() => setPendingChange(null)}
            />
          )}

          {loading ? (
            <div className="animate-pulse flex flex-col gap-5">
              <div className="h-72 bg-gray-100 rounded-2xl" />
              <div className="h-32 bg-gray-100 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Current policy */}
              <SectionCard>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <SectionTitle title="Current policy">
                      {style && <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${style.badge}`}>{style.label}</span>}
                    </SectionTitle>
                  </div>
                  {current && (
                    <button
                      onClick={() => router.push(`/student/profile/updatehealth-insurance?id=${current.id}`)}
                      className="inline-flex items-center gap-1.5 border border-primary text-primary text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/5 transition"
                    >
                      <RiPencilLine size={15} /> Edit
                    </button>
                  )}
                </div>

                {current ? (
                  <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-5">
                    {/* Insurance card */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-primary">Insurance card</span>
                      <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-primary/25 bg-[#F3F7FD] flex items-center justify-center overflow-hidden">
                        {current.fileUrl ? (
                          <a href={current.fileUrl} target="_blank" rel="noreferrer" className="w-full h-full">
                            <img src={current.fileUrl} alt="Insurance card" className="w-full h-full object-contain" />
                          </a>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <RiBankCardLine size={26} />
                            <span className="text-xs">No card uploaded</span>
                          </div>
                        )}
                      </div>
                      {current.fileUrl && (
                        <a href={current.fileUrl} target="_blank" rel="noreferrer" download
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 w-fit">
                          <RiDownloadLine size={13} /> Download card
                        </a>
                      )}
                      {current.backFileUrl && (
                        <a href={current.backFileUrl} target="_blank" rel="noreferrer" download
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 w-fit">
                          <RiDownloadLine size={13} /> Download back of card
                        </a>
                      )}
                    </div>

                    {/* Details + coverage */}
                    <div className="flex flex-col gap-4 min-w-0">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <InfoTile label="Provider" value={current.provider} />
                        <InfoTile label="Policy No." value={current.policyNumber} />
                        <InfoTile label="Coverage Type" value={current.coverageType} />
                        <InfoTile label="Valid From" value={fmtDate(current.startDate)} />
                        <InfoTile label="Valid Until" value={fmtDate(current.expiryDate)} tone={untilIsUrgent ? 'danger' : 'default'} />
                      </div>
                      <ValidityBar
                        issueDate={current.startDate}
                        expiryDate={current.expiryDate}
                        rangeLabel="Covered"
                        note={status === 'expired'
                          ? 'This policy has expired — please add your new policy.'
                          : 'Your visa extension needs insurance that covers your whole stay.'}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <p className="text-sm font-semibold text-gray-700">No health insurance added yet</p>
                    <button
                      onClick={() => router.push('/student/profile/updatehealth-insurance')}
                      className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition"
                    >
                      <RiAddLine size={16} /> Add policy
                    </button>
                  </div>
                )}
              </SectionCard>

              {/* History */}
              <SectionCard>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <SectionTitle title="Policy history" />
                  <p className="text-xs text-gray-500">Previous policies are kept for your records</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Provider', 'Policy No.', 'Valid From', 'Valid Until', 'Status'].map(h => (
                          <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-primary/70">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.length > 0 ? history.map(ins => {
                        const st = EXPIRY_STYLE[expiryStatus(ins.expiryDate)];
                        return (
                          <tr key={ins.id} className="border-b border-gray-50 last:border-none">
                            <td className="py-2.5 px-2 font-medium text-gray-800">{ins.provider}</td>
                            <td className="py-2.5 px-2 text-gray-700">{ins.policyNumber || '—'}</td>
                            <td className="py-2.5 px-2 text-gray-700">{fmtDate(ins.startDate)}</td>
                            <td className="py-2.5 px-2 text-gray-700">{fmtDate(ins.expiryDate)}</td>
                            <td className="py-2.5 px-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${st.badge}`}>{st.label}</span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center">
                            <p className="text-sm font-semibold text-gray-700">No previous policies</p>
                            <p className="text-xs text-gray-500 mt-0.5">When you add a new policy, this one will move here.</p>
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
    </div>
  );
}
