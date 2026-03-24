'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';

interface Dependent {
  id: number;
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  relationship: string;
  phone: string;
  visaExpiry: string;
  images: { visa: string | null; arrival: string | null; departed: string | null; passport: string | null };
}

const mockDependents: Dependent[] = [
  {
    id: 1,
    prefix: 'Mrs.',
    firstName: 'Malee',
    middleName: '',
    lastName: 'Phongphrathapet',
    email: 'malee@gmail.com',
    relationship: 'Parent',
    phone: '+66 81 111 2222',
    visaExpiry: '31 Dec 2024',
    images: { visa: null, arrival: null, departed: null, passport: 'https://wacinfotech.com/images/OS550/passport-thai-mrp.jpg' },
  },
];

function daysRemaining(expiryStr: string): number {
  const parts = expiryStr.split(' ');
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const d = new Date(Number(parts[2]), months[parts[1]], Number(parts[0]));
  const diff = d.getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const labelCls = 'text-xs font-medium text-primary/70';
const valueCls = 'text-sm font-medium text-gray-800';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelCls}>{label}</span>
      <span className={valueCls}>{value || '—'}</span>
    </div>
  );
}

const IMAGE_SLOTS = [
  { key: 'visa' as const,     label: 'Visa Permission / Sticker' },
  { key: 'arrival' as const,  label: 'Admitted Stamp (Arrival to Thailand)' },
  { key: 'departed' as const, label: 'Departed Stamp (Departure from Thailand)' },
  { key: 'passport' as const, label: 'Passport Image' },
];

function DependentModal({ dep, onClose }: { dep: Dependent; onClose: () => void }) {
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
          <InfoRow label="Prefix" value={dep.prefix} />
          <InfoRow label="First Name" value={dep.firstName} />
          <InfoRow label="Middle Name" value={dep.middleName} />
          <InfoRow label="Last Name" value={dep.lastName} />
          <InfoRow label="Relationship" value={dep.relationship} />
          <InfoRow label="Email" value={dep.email} />
          <InfoRow label="Phone" value={dep.phone} />
          <InfoRow label="Visa Expiry" value={dep.visaExpiry} />
        </div>

        <hr className="border-gray-100 " />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Documents</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            {IMAGE_SLOTS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-primary/60">{label}</span>
                <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl h-32 bg-gray-50 overflow-hidden">
                  {dep.images[key] ? (
                    <img src={dep.images[key]!} alt={label} className="w-full h-full object-contain" />
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
  const [dependents, setDependents] = useState<Dependent[]>(mockDependents);
  const [selected, setSelected] = useState<Dependent | null>(null);

  function remove(id: number) {
    setDependents(prev => prev.filter(d => d.id !== id));
  }

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
          <h1 className="text-2xl font-semibold text-primary flex-1">My Dependents</h1>
          <button
            onClick={() => router.push('/student/profile/updatedependent')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Add
          </button>
        </div>

        {dependents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No dependents added.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-primary">Dependents ({dependents.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Email</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Relationship</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Visa Expiry</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Visa Remaining</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dependents.map(dep => {
                    const days = daysRemaining(dep.visaExpiry);
                    const status = days < 14 ? 'critical' : days <= 45 ? 'warning' : 'normal';
                    return (
                      <tr key={dep.id} className="border-b border-gray-100 last:border-none">
                        <td className="py-2.5 px-3 font-medium text-primary">
                          {[dep.prefix, dep.firstName, dep.middleName, dep.lastName].filter(Boolean).join(' ')}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{dep.email || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-500">{dep.relationship || '—'}</td>
                        <td className="py-2.5 px-3 text-gray-500">{dep.visaExpiry || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${status === 'critical' ? 'bg-red-100 text-red-600' : status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-700'}`}>
                            {days} days
                          </span>
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
