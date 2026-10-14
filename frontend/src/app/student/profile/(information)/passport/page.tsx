'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiAddLine, RiPencilLine, RiImageLine, RiDownloadLine } from 'react-icons/ri';
import { studentMeApi, changeRequestApi, type ApiPassport, type ApiChangeRequest } from '@/lib/api';
import PendingBanner from '@/components/PendingBanner';
import {
  InfoTile, SectionTitle, ValidityBar, fmtDate, expiryStatus, EXPIRY_STYLE, FIRST_REMINDER_DAYS,
} from '@/components/profile/ProfileUI';

export default function PassportPage() {
  const router = useRouter();
  const [passports, setPassports] = useState<ApiPassport[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChange, setPendingChange] = useState<ApiChangeRequest | null>(null);

  useEffect(() => {
    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        setPassports(s.passports);
        return s.id;
      })
      .then(sid => changeRequestApi.getPendingForEntity('PASSPORT', null, sid).then(r => setPendingChange(r.data.data)).catch(() => {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const current = passports.find(p => p.isCurrent) ?? passports[0] ?? null;
  const history = passports
    .filter(p => p !== current)
    .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());

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

        {pendingChange && (
          <PendingBanner
            pending={pendingChange}
            fieldLabels={{ passportNumber: 'Passport No.', issuingCountry: 'Issuing Country', issueDate: 'Date of Issue', expiryDate: 'Expiry Date', placeOfIssue: 'Place of Issue' }}
            onCancel={() => setPendingChange(null)}
          />
        )}

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
                  <button
                    onClick={() => router.push(`/student/profile/updatepassport?id=${current.id}`)}
                    className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition"
                  >
                    <RiPencilLine size={15} /> Edit
                  </button>
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
                <SectionTitle title="Passport history" />
                <p className="text-xs text-gray-500">Previous passports are kept for your records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Passport No.', 'Issuing Country', 'Date of Issue', 'Expiry Date', 'Status'].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-primary/70">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.length > 0 ? history.map(p => {
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
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center">
                          <p className="text-sm font-semibold text-gray-700">No previous passports</p>
                          <p className="text-xs text-gray-500 mt-0.5">When you add a new passport, this one will move here.</p>
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
