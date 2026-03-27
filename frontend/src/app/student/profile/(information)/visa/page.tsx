'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { studentMeApi, visaApi, type ApiVisa } from '@/lib/api';
import toast from 'react-hot-toast';

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

function VisaModal({ visa, onClose }: { visa: ApiVisa; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100vh-10rem)] sm:max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">Visa Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition">
            <FiX size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoField label="Visa No." value={visa.visaNumber} />
          <InfoField label="Visa Type" value={visa.visaType} />
          <InfoField label="Status" value={visa.status} />
          <InfoField label="Issuing Country" value={visa.issuingCountry} />
          <InfoField label="Place of Issue" value={visa.issuingPlace} />
          <InfoField label="Number of Entries" value={visa.entries} />
          <InfoField label="Valid From" value={fmtDate(visa.issueDate)} />
          <InfoField label="Valid Until" value={fmtDate(visa.expiryDate)} />
          <InfoField label="Remarks" value={visa.remarks} />
        </div>

        {(visa.imageUrl || visa.arrivalImageUrl || visa.departedImageUrl || visa.passportImageUrl) && (
          <>
            <hr className="border-gray-100" />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">Documents</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'imageUrl',         label: 'Visa Sticker' },
                  { key: 'arrivalImageUrl',   label: 'Arrival Stamp' },
                  { key: 'departedImageUrl',  label: 'Departure Stamp' },
                  { key: 'passportImageUrl',  label: 'Passport' },
                ] as { key: keyof ApiVisa; label: string }[]).map(({ key, label }) =>
                  visa[key] ? (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">{label}</span>
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                        <img src={visa[key] as string} alt={label} className="w-full object-contain max-h-40" />
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VisaPage() {
  const router = useRouter();
  const [visas, setVisas] = useState<ApiVisa[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ApiVisa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        setStudentId(s.id);
        return visaApi.getAll(s.id);
      })
      .then(res => setVisas(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function remove(visaId: number) {
    if (!studentId) return;
    try {
      await visaApi.delete(studentId, visaId);
      setVisas(prev => prev.filter(v => v.id !== visaId));
      toast.success('Visa removed');
    } catch {
      toast.error('Failed to remove visa');
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 flex-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-primary flex-1">My Visa</h1>
          <button
            onClick={() => router.push('/student/profile/updatevisa')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Add
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[0, 1].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        ) : visas.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-primary">Visas ({visas.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Visa Type</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Issuing Country</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Valid From</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Valid Until</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Entries</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Remaining</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visas.map(v => {
                    const days = daysRemaining(v.expiryDate);
                    const status = days < 14 ? 'critical' : days <= 45 ? 'warning' : 'normal';
                    return (
                      <tr key={v.id} className="border-b border-gray-100 last:border-none">
                        <td className="py-2.5 px-3 text-gray-700">{v.visaType}</td>
                        <td className="py-2.5 px-3 text-gray-500">{v.issuingCountry}</td>
                        <td className="py-2.5 px-3 text-gray-500">{fmtDate(v.issueDate)}</td>
                        <td className="py-2.5 px-3 text-gray-500">{fmtDate(v.expiryDate)}</td>
                        <td className="py-2.5 px-3 text-gray-500">{v.entries || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${status === 'critical' ? 'bg-red-100 text-red-600' : status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-700'}`}>
                            {days} days
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button onClick={() => remove(v.id)} variant='danger' label='Remove' />
                            <Button onClick={() => router.push(`/student/profile/updatevisa?id=${v.id}`)} variant='warning' />
                            <Button onClick={() => setSelected(v)} variant='info' />
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
          <p className="text-sm text-gray-400 text-center py-4">No visas added yet.</p>
        )}
      </div>

      {selected && <VisaModal visa={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
