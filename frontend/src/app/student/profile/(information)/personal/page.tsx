'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiPencilLine, RiGraduationCapLine, RiMailLine, RiPhoneLine } from 'react-icons/ri';
import { studentMeApi, changeRequestApi, type ApiChangeRequest } from '@/lib/api';
import PendingBanner from '@/components/PendingBanner';

/* Value tile — light-blue box with a small label above the value */
function InfoTile({ label, value, className = '' }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl bg-[#F3F7FD] px-3 py-2.5 min-w-0 ${className}`}>
      <span className="text-[11px] font-medium text-primary/70">{label}</span>
      <span className="text-sm font-medium text-gray-800 break-words">{value || '—'}</span>
    </div>
  );
}

/* Section card with the accent-bar heading */
function SectionCard({ title, badge, children }: { title: string; badge?: string | null; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="w-1 h-5 rounded-full bg-primary" />
        <h2 className="text-base font-semibold text-gray-800 flex-1">{title}</h2>
        {badge && (
          <span className="px-3 py-1 rounded-full bg-[#DEEBFF] text-primary text-[11px] font-semibold">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* Icon + label/value row in the profile card */
function SideRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#F3F7FD] text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-800 break-all">{value || '—'}</span>
      </div>
    </div>
  );
}

export default function PersonalPage() {
  const router = useRouter();
  const [student, setStudent] = useState<Awaited<ReturnType<typeof studentMeApi.get>>['data']['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingChange, setPendingChange] = useState<ApiChangeRequest | null>(null);

  useEffect(() => {
    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        setStudent(s);
        return s.id;
      })
      .then(sid => changeRequestApi.getPendingForEntity('STUDENT_PROFILE', sid, sid).then(r => setPendingChange(r.data.data)).catch(() => {}))
      .catch(() => {})
      .finally(() => setLoading(false));
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
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F3F7FD] text-primary hover:bg-primary hover:text-white transition"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-primary flex-1">Personal Information</h1>
          <button
            onClick={() => router.push('/student/profile/updatepersonal')}
            className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            <RiPencilLine size={15} /> Edit
          </button>
        </div>
        {pendingChange && (
          <PendingBanner
            pending={pendingChange}
            currentData={student ? Object.fromEntries(Object.entries(student).map(([k, v]) => [k, v as unknown])) : {}}
            fieldLabels={{ titleEn: 'Title', firstNameEn: 'First Name', middleNameEn: 'Middle Name', lastNameEn: 'Last Name', dateOfBirth: 'Date of Birth', gender: 'Gender', nationality: 'Nationality', religion: 'Religion', homeCountry: 'Home Country', phone: 'Phone', addressInThailand: 'Address in Thailand', homeAddress: 'Home Address', emergencyContact: 'Emergency Contact', emergencyEmail: 'Emergency Email', emergencyPhone: 'Emergency Phone', emergencyRelation: 'Emergency Relation' }}
            onCancel={() => setPendingChange(null)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center gap-4">
            <div className="w-28 h-28 rounded-2xl border-2 border-primary p-1">
              <div className="w-full h-full rounded-xl bg-[#DEEBFF] flex items-center justify-center text-2xl font-bold text-primary overflow-hidden">
                {s?.photoUrl ? (
                  <img src={s.photoUrl} alt={fullName || 'Profile'} className="w-full h-full object-cover" />
                ) : (
                  fullName ? fullName.charAt(0).toUpperCase() : '?'
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-lg font-bold text-gray-800 leading-snug">{fullName || '—'}</p>
              <p className="text-sm text-gray-500">Student</p>
            </div>
            {(s?.level || s?.program) && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {s?.level && <span className="px-2.5 py-1 rounded-full bg-[#DEEBFF] text-primary text-[11px] font-semibold">{s.level}</span>}
                {s?.program && <span className="px-2.5 py-1 rounded-full bg-[#DEEBFF] text-primary text-[11px] font-semibold">{s.program}</span>}
              </div>
            )}
            <hr className="w-full border-gray-100" />
            <div className="w-full flex flex-col gap-3">
              <SideRow icon={<RiGraduationCapLine size={15} />} label="Faculty" value={s?.faculty} />
              <SideRow icon={<RiMailLine size={15} />} label="Email" value={s?.email} />
              <SideRow icon={<RiPhoneLine size={15} />} label="Phone" value={s?.phone} />
            </div>
          </div>

          {/* Detail sections */}
          <div className="flex flex-col gap-5 min-w-0">
            <SectionCard title="Personal Details">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoTile label="Title" value={s?.titleEn} />
                <InfoTile label="First Name" value={s?.firstNameEn} />
                <InfoTile label="Middle Name" value={s?.middleNameEn} />
                <InfoTile label="Last Name" value={s?.lastNameEn} />
                <InfoTile label="Date of Birth" value={dob} />
                <InfoTile label="Gender" value={s?.gender} />
                <InfoTile label="Religion" value={s?.religion} />
                <InfoTile label="Nationality" value={s?.nationality} />
              </div>
            </SectionCard>

            <SectionCard title="Contact & Address">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InfoTile label="Home Country" value={s?.homeCountry} />
                <InfoTile label="Email" value={s?.email} />
                <InfoTile label="Phone" value={s?.phone} />
                <InfoTile label="Home Address" value={s?.homeAddress} />
              </div>
            </SectionCard>

            <SectionCard title="Emergency Contact" badge={s?.emergencyRelation}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-gray-100 px-4 py-3">
                <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center text-base font-semibold shrink-0">
                  {s?.emergencyContact ? s.emergencyContact.replace(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+/i, '').charAt(0).toUpperCase() : '?'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-0">
                  {[
                    { label: 'Name', value: s?.emergencyContact },
                    { label: 'Email', value: s?.emergencyEmail },
                    { label: 'Phone', value: s?.emergencyPhone },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-primary/70">{f.label}</span>
                      <span className="text-sm font-semibold text-gray-800 break-words">{f.value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

      </div>
    </div>
  );
}
