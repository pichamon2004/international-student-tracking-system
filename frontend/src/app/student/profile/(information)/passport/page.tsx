'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';

interface Passport {
  id: number;
  passportNo: string;
  prefix: string;
  givenName: string;
  middleName: string;
  surname: string;
  nationality: string;
  nationalityId: string;
  placeOfBirth: string;
  country: string;
  birthDate: string;
  dateOfIssue: string;
  expiryDate: string;
  image?: string | null;
}

const mockPassports: Passport[] = [
  {
    id: 1,
    passportNo: 'UA51234567',
    prefix: 'Miss',
    givenName: 'Pichamon',
    middleName: '',
    surname: 'Phongphrathapet',
    nationality: 'Thai',
    nationalityId: '1123100110110',
    placeOfBirth: 'Khon Kaen',
    country: 'Thailand',
    birthDate: '15 Mar 1998',
    dateOfIssue: '01 Jun 2020',
    expiryDate: '31 May 2030',
    image: 'https://wacinfotech.com/images/OS550/passport-thai-mrp.jpg',
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

function PassportModal({ passport, onClose }: { passport: Passport; onClose: () => void }) {
  const fullName = [passport.prefix, passport.givenName, passport.middleName, passport.surname].filter(Boolean).join(' ');
  const sex = passport.prefix === 'Mr.' ? 'M' : 'F';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100vh-10rem)] sm:max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">Passport Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition">
            <FiX size={16} />
          </button>
        </div>

        {/* Passport image + preview card */}
        <div className="">
          {/* Passport image */}
          <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl min-h-60 bg-gray-50 overflow-hidden">
            {passport.image ? (
              <img src={passport.image} alt="Passport" className="w-full h-full object-contain rounded-2xl max-h-56" />
            ) : (
              <span className="text-sm text-gray-400">No image uploaded</span>
            )}
          </div>

         
        </div>

        {/* All fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 ">
          <InfoField label="Passport No." value={passport.passportNo} />
          <InfoField label="Prefix" value={passport.prefix} />
          <InfoField label="Given Name" value={passport.givenName} />
          <InfoField label="Middle Name" value={passport.middleName} />
          <InfoField label="Surname" value={passport.surname} />
          <InfoField label="Nationality" value={passport.nationality} />
          <InfoField label="National ID" value={passport.nationalityId} />
          <InfoField label="Place of Birth" value={passport.placeOfBirth} />
          <InfoField label="Country" value={passport.country} />
          <InfoField label="Date of Birth" value={passport.birthDate} />
          <InfoField label="Date of Issue" value={passport.dateOfIssue} />
          <InfoField label="Date of Expiry" value={passport.expiryDate} />
        </div>
      </div>
    </div>
  );
}

export default function PassportPage() {
  const router = useRouter();
  const [passports, setPassports] = useState<Passport[]>(mockPassports);
  const [selected, setSelected] = useState<Passport | null>(null);

  function remove(id: number) {
    setPassports(prev => prev.filter(p => p.id !== id));
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
          <h1 className="text-2xl font-semibold text-primary flex-1">My Passport</h1>
          <button
            onClick={() => router.push('/student/profile/updatepassport')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Add
          </button>
        </div>

        {/* List */}
        {passports.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-primary">Passports ({passports.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Passport No.</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Date of Issue</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Expiry Date</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Passport Remaining</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {passports.map(p => {
                    const days = daysRemaining(p.expiryDate);
                    const status = days < 14 ? 'critical' : days <= 45 ? 'warning' : 'normal';
                    return (
                      <tr key={p.id} className="border-b border-gray-100 last:border-none">
                        <td className="py-2.5 px-3 font-medium text-primary">{p.passportNo}</td>
                        <td className="py-2.5 px-3 text-primary">{[p.prefix, p.givenName, p.middleName, p.surname].filter(Boolean).join(' ')}</td>
                        <td className="py-2.5 px-3 text-primary">{p.dateOfIssue}</td>
                        <td className="py-2.5 px-3 text-primary">{p.expiryDate}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${status === 'critical' ? 'bg-red-100 text-red-600' : status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-700'}`}>
                            {days} days
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button onClick={() => remove(p.id)} variant='danger' label='Remove' />
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
