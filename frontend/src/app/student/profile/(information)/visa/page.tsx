'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';

interface Visa {
  id: number;
  passport: string;
  placeOfIssue: string;
  validFrom: string;
  validUntil: string;
  visaType: string;
  numberOfEntries: string;
  sex: string;
  givenName: string;
  surname: string;
  dateOfBirth: string;
  nationality: string;
  remarks: string;
  images: { visa: string | null; arrival: string | null; departed: string | null; passport: string | null };
}

const mockVisas: Visa[] = [
  {
    id: 1,
    passport: 'UA51234567',
    placeOfIssue: 'Bangkok',
    validFrom: '01 Jan 2024',
    validUntil: '31 Dec 2026',
    visaType: 'ED',
    numberOfEntries: 'Multiple',
    sex: 'F',
    givenName: 'Pichamon',
    surname: 'Phongphrathapet',
    dateOfBirth: '15 Mar 1998',
    nationality: 'Thai',
    remarks: 'Study purposes',
    images: { visa: null, arrival: null, departed: null, passport: null },
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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-primary/60">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '—'}</span>
    </div>
  );
}

const IMAGE_SLOTS = [
  { key: 'visa' as const,      label: 'Visa Permission / Sticker' },
  { key: 'arrival' as const,   label: 'Admitted Stamp (Arrival to Thailand)' },
  { key: 'departed' as const,  label: 'Departed Stamp (Departure from Thailand)' },
  { key: 'passport' as const,  label: 'Passport Image' },
];

function VisaModal({ visa, onClose }: { visa: Visa; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100vh-10rem)] sm:max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">Visa Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition">
            <FiX size={16} />
          </button>
        </div>

        {/* All fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoField label="Passport No." value={visa.passport} />
          <InfoField label="Place of Issue" value={visa.placeOfIssue} />
          <InfoField label="Visa Type" value={visa.visaType} />
          <InfoField label="Number of Entries" value={visa.numberOfEntries} />
          <InfoField label="Valid From" value={visa.validFrom} />
          <InfoField label="Valid Until" value={visa.validUntil} />
          <InfoField label="Given Name" value={visa.givenName} />
          <InfoField label="Surname" value={visa.surname} />
          <InfoField label="Sex" value={visa.sex} />
          <InfoField label="Date of Birth" value={visa.dateOfBirth} />
          <InfoField label="Nationality" value={visa.nationality} />
          <InfoField label="Remarks" value={visa.remarks} />
        </div>

        <hr className="border-gray-100" />

        {/* Document images */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Visa Documents</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            {IMAGE_SLOTS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-primary/60">{label}</span>
                <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl h-32 bg-gray-50 overflow-hidden">
                  {visa.images[key] ? (
                    <img src={visa.images[key]!} alt={label} className="w-full h-full object-contain" />
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

export default function VisaPage() {
  const router = useRouter();
  const [visas, setVisas] = useState<Visa[]>(mockVisas);
  const [selected, setSelected] = useState<Visa | null>(null);

  function remove(id: number) {
    setVisas(prev => prev.filter(v => v.id !== id));
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
          <h1 className="text-2xl font-semibold text-primary flex-1">My Visa</h1>
          <button
            onClick={() => router.push('/student/profile/updatevisa')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Add
          </button>
        </div>

        {/* List */}
        {visas.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-primary">Visas ({visas.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Passport No.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Visa Type</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Valid From</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Valid Until</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Number of Entries</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Remarks</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Visa Remaining</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visas.map(v => {
                    const days = daysRemaining(v.validUntil);
                    const status = days < 14 ? 'critical' : days <= 45 ? 'warning' : 'normal';
                    return (
                      <tr key={v.id} className="border-b border-gray-100 last:border-none">
                        <td className="py-2.5 px-3 font-medium text-primary">{v.passport}</td>
                        <td className="py-2.5 px-3 text-gray-700">{v.visaType}</td>
                        <td className="py-2.5 px-3 text-gray-500">{v.validFrom}</td>
                        <td className="py-2.5 px-3 text-gray-500">{v.validUntil}</td>
                        <td className="py-2.5 px-3 text-gray-500">{v.numberOfEntries}</td>
                        <td className="py-2.5 px-3 text-gray-500">{v.remarks || '—'}</td>
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
