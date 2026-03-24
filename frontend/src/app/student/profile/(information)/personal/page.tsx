'use client';

import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';

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

const mock = {
  prefix: 'Miss',
  firstName: 'Pichamon',
  middleName: '',
  lastName: 'Phongphrathapet',
  dateOfBirth: '15 Mar 1998',
  gender: 'Female',
  religion: 'Buddhism',
  nationality: 'Thai',
  homeCountry: 'Thailand',
  homeAddress: '123 Moo 4, Muang, Khon Kaen 40000',
  email: 'pichamon.p@kkumail.com',
  phone: '+66 81 234 5678',
  faculty: 'College of Computing',
  degree: 'Doctoral Degree',
  program: 'Computer Science',
  photo:
    'https://api.computing.kku.ac.th//storage/images/1661876218-pusadeeseresangtakul1_1.png',
  ecPrefix: 'Mr.',
  ecFirstName: 'Somchai',
  ecLastName: 'Phongphrathapet',
  ecEmail: 'somchai@gmail.com',
  ecPhone: '+66 89 876 5432',
  ecRelationship: 'Parent',
};

export default function PersonalPage() {
  const router = useRouter();

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
          <img
            src={mock.photo}
            alt="Profile"
            className="w-24 h-24 rounded-2xl object-cover border border-gray-200"
          />
          <div className="flex flex-col gap-1 pt-1">
            <p className="text-base font-semibold text-gray-900">
              {mock.prefix} {mock.firstName} {mock.middleName} {mock.lastName}
            </p>
            <p className="text-sm text-gray-500">{mock.faculty}</p>
            <p className="text-sm text-gray-500">{mock.degree} — {mock.program}</p>
          </div>
        </div>

        {/* Personal Details */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Personal Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoRow label="Prefix" value={mock.prefix} />
            <InfoRow label="First Name" value={mock.firstName} />
            <InfoRow label="Middle Name" value={mock.middleName} />
            <InfoRow label="Last Name" value={mock.lastName} />
            <InfoRow label="Date of Birth" value={mock.dateOfBirth} />
            <InfoRow label="Gender" value={mock.gender} />
            <InfoRow label="Religion" value={mock.religion} />
            <InfoRow label="Nationality" value={mock.nationality} />
            <InfoRow label="Home Country" value={mock.homeCountry} />
            <InfoRow label="Email" value={mock.email} />
            <InfoRow label="Phone" value={mock.phone} />
            <InfoRow label="Home Address" value={mock.homeAddress} />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Emergency Contact */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Emergency Contact</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoRow label="Prefix" value={mock.ecPrefix} />
            <InfoRow label="First Name" value={mock.ecFirstName} />
            <InfoRow label="Last Name" value={mock.ecLastName} />
            <InfoRow label="Email" value={mock.ecEmail} />
            <InfoRow label="Phone" value={mock.ecPhone} />
            <InfoRow label="Relationship" value={mock.ecRelationship} />
          </div>
        </div>

      </div>
    </div>
  );
}
