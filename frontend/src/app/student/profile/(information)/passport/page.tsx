'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { studentMeApi, type ApiPassport } from '@/lib/api';

function daysRemaining(expiryDate: string): number {
  return Math.max(0, Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000));
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-primary/60">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '—'}</span>
    </div>
  );
}

function PassportModal({ passport, onClose }: { passport: ApiPassport; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100vh-10rem)] sm:max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">Passport Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition">
            <FiX size={16} />
          </button>
        </div>

        <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl min-h-60 bg-gray-50 overflow-hidden">
          {passport.imageUrl ? (
            <img src={passport.imageUrl} alt="Passport" className="w-full h-full object-contain rounded-2xl max-h-56" />
          ) : (
            <span className="text-sm text-gray-400">No image uploaded</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoField label="Passport No." value={passport.passportNumber} />
          <InfoField label="Issuing Country" value={passport.issuingCountry} />
          <InfoField label="Place of Issue" value={passport.placeOfIssue} />
          <InfoField label="Date of Issue" value={fmtDate(passport.issueDate)} />
          <InfoField label="Date of Expiry" value={fmtDate(passport.expiryDate)} />
          <InfoField label="Verified" value={passport.isVerified ? 'Yes' : 'No'} />
        </div>
      </div>
    </div>
  );
}

export default function PassportPage() {
  const router = useRouter();
  const [passports, setPassports] = useState<ApiPassport[]>([]);
  const [selected, setSelected] = useState<ApiPassport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentMeApi.get()
      .then(res => setPassports(res.data.data.passports))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-primary flex-1">My Passport</h1>
          <button
            onClick={() => router.push('/student/profile/updatepassport')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Add
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[0, 1].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        ) : passports.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-primary">Passports ({passports.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Passport No.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Issuing Country</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Date of Issue</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Expiry Date</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Remaining</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {passports.map(p => {
                    const days = daysRemaining(p.expiryDate);
                    const status = days < 14 ? 'critical' : days <= 45 ? 'warning' : 'normal';
                    return (
                      <tr key={p.id} className="border-b border-gray-100 last:border-none">
                        <td className="py-2.5 px-3 font-medium text-primary">{p.passportNumber}</td>
                        <td className="py-2.5 px-3 text-primary">{p.issuingCountry}</td>
                        <td className="py-2.5 px-3 text-primary">{fmtDate(p.issueDate)}</td>
                        <td className="py-2.5 px-3 text-primary">{fmtDate(p.expiryDate)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${status === 'critical' ? 'bg-red-100 text-red-600' : status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-700'}`}>
                            {days} days
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button onClick={() => router.push(`/student/profile/updatepassport?id=${p.id}`)} variant='warning' />
                            <Button onClick={() => setSelected(p)} variant='info' />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No passports added yet.</p>
        )}
      </div>

      {selected && <PassportModal passport={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
