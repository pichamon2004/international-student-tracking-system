'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { studentMeApi } from '@/lib/api';

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

export default function PersonalPage() {
  const router = useRouter();
  const [student, setStudent] = useState<Awaited<ReturnType<typeof studentMeApi.get>>['data']['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentMeApi.get().then(res => setStudent(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 flex-1 animate-pulse">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 flex-1">
          <div className="h-8 bg-gray-100 rounded w-1/2" />
          <div className="flex items-start gap-5">
            <div className="w-24 h-24 rounded-2xl bg-gray-100" />
            <div className="flex flex-col gap-2 pt-1 flex-1">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  const s = student;
  const fullName = [s?.titleEn, s?.firstNameEn, s?.middleNameEn, s?.lastNameEn].filter(Boolean).join(' ');
  const dob = s?.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-primary flex-1">Personal Information</h1>
          <button
            onClick={() => router.push('/student/profile/updatepersonal')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Edit
          </button>
        </div>
        {/* Profile top */}
        <div className="flex items-start gap-5">
          <div className="w-24 h-24 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl font-bold text-gray-400 overflow-hidden">
            {s?.photoUrl ? (
              <img src={s.photoUrl} alt={fullName || 'Profile'} className="w-full h-full object-cover" />
            ) : (
              fullName ? fullName.charAt(0).toUpperCase() : '?'
            )}
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <p className="text-base font-semibold text-gray-900">{fullName || '—'}</p>
            <p className="text-sm text-gray-500">{s?.faculty || '—'}</p>
            <p className="text-sm text-gray-500">{s?.level || '—'}{s?.program ? ` — ${s.program}` : ''}</p>
          </div>
        </div>

        {/* Personal Details */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Personal Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoRow label="Title" value={s?.titleEn} />
            <InfoRow label="First Name" value={s?.firstNameEn} />
            <InfoRow label="Middle Name" value={s?.middleNameEn} />
            <InfoRow label="Last Name" value={s?.lastNameEn} />
            <InfoRow label="Date of Birth" value={dob} />
            <InfoRow label="Gender" value={s?.gender} />
            <InfoRow label="Religion" value={s?.religion} />
            <InfoRow label="Nationality" value={s?.nationality} />
            <InfoRow label="Home Country" value={s?.homeCountry} />
            <InfoRow label="Email" value={s?.email} />
            <InfoRow label="Phone" value={s?.phone} />
            <InfoRow label="Home Address" value={s?.homeAddress} />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Emergency Contact */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Emergency Contact</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoRow label="Name" value={s?.emergencyContact} />
            <InfoRow label="Email" value={s?.emergencyEmail} />
            <InfoRow label="Phone" value={s?.emergencyPhone} />
            <InfoRow label="Relationship" value={s?.emergencyRelation} />
          </div>
        </div>

      </div>
    </div>
  );
}
