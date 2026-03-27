'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { studentMeApi, dependentApi, type ApiDependent } from '@/lib/api';
import { setProgressField } from '@/lib/progressStore';
import toast from 'react-hot-toast';

function daysRemaining(expiryDate: string | null | undefined): number {
  if (!expiryDate) return 0;
  return Math.max(0, Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000));
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const labelCls = 'text-xs font-medium text-primary/70';
const valueCls = 'text-sm font-medium text-gray-800';

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelCls}>{label}</span>
      <span className={valueCls}>{value || '—'}</span>
    </div>
  );
}

function DependentModal({ dep, onClose }: { dep: ApiDependent; onClose: () => void }) {
  const IMAGE_SLOTS = [
    { key: 'visaImageUrl' as const,      label: 'Visa Permission / Sticker' },
    { key: 'arrivalImageUrl' as const,   label: 'Arrival Stamp' },
    { key: 'departedImageUrl' as const,  label: 'Departure Stamp' },
    { key: 'passportImageUrl' as const,  label: 'Passport Image' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100vh-10rem)] sm:max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">Dependent Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition">
            <FiX size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Title" value={dep.title} />
          <InfoRow label="First Name" value={dep.firstName} />
          <InfoRow label="Middle Name" value={dep.middleName} />
          <InfoRow label="Last Name" value={dep.lastName} />
          <InfoRow label="Relationship" value={dep.relationship} />
          <InfoRow label="Gender" value={dep.gender} />
          <InfoRow label="Date of Birth" value={fmtDate(dep.dateOfBirth)} />
          <InfoRow label="Nationality" value={dep.nationality} />
          <InfoRow label="Passport No." value={dep.passportNumber} />
          <InfoRow label="Passport Expiry" value={fmtDate(dep.passportExpiry)} />
          <InfoRow label="Visa Type" value={dep.visaType} />
          <InfoRow label="Visa Expiry" value={fmtDate(dep.visaExpiry)} />
        </div>

        <hr className="border-gray-100" />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Documents</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            {IMAGE_SLOTS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-primary/60">{label}</span>
                <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl h-32 bg-gray-50 overflow-hidden">
                  {dep[key] ? (
                    <img src={dep[key]!} alt={label} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">No image</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DependentPage() {
  const router = useRouter();
  const [dependents, setDependents] = useState<ApiDependent[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ApiDependent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        setStudentId(s.id);
        return dependentApi.getAll(s.id);
      })
      .then(res => setDependents(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function remove(depId: number) {
    if (!studentId) return;
    try {
      await dependentApi.delete(studentId, depId);
      setDependents(prev => prev.filter(d => d.id !== depId));
      toast.success('Dependent removed');
    } catch {
      toast.error('Failed to remove dependent');
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
          <h1 className="text-2xl font-semibold text-primary flex-1">My Dependents</h1>
          <button
            onClick={() => router.push('/student/profile/updatedependent')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Add
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[0, 1].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        ) : dependents.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-gray-400 text-center">No dependents added.</p>
            <button
              onClick={() => {
                setProgressField('dependentCompleted', true);
                toast.success('Marked as no dependents');
                router.back();
              }}
              className="text-sm text-gray-500 border border-gray-300 px-5 py-2 rounded-xl hover:border-primary hover:text-primary transition"
            >
              I have no dependents
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-primary">Dependents ({dependents.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Relationship</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Nationality</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Visa Expiry</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Visa Remaining</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dependents.map(dep => {
                    const days = daysRemaining(dep.visaExpiry);
                    const status = days < 14 ? 'critical' : days <= 45 ? 'warning' : 'normal';
                    const fullName = [dep.title, dep.firstName, dep.middleName, dep.lastName].filter(Boolean).join(' ');
                    return (
                      <tr key={dep.id} className="border-b border-gray-100 last:border-none">
                        <td className="py-2.5 px-3 font-medium text-primary">{fullName}</td>
                        <td className="py-2.5 px-3 text-gray-500">{dep.relationship}</td>
                        <td className="py-2.5 px-3 text-gray-500">{dep.nationality}</td>
                        <td className="py-2.5 px-3 text-gray-500">{fmtDate(dep.visaExpiry)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {dep.visaExpiry ? (
                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${status === 'critical' ? 'bg-red-100 text-red-600' : status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-700'}`}>
                              {days} days
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button onClick={() => remove(dep.id)} variant="danger" label="Remove" />
                            <Button onClick={() => router.push(`/student/profile/updatedependent?id=${dep.id}`)} variant="warning" />
                            <Button onClick={() => setSelected(dep)} variant="info" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selected && <DependentModal dep={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
