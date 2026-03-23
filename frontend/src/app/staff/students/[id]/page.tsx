'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';

type Tab = 'Student Information' | 'Passport & Visa' | 'Health Insurance' | 'Academic Record' | 'Recent Activity';

const TABS: Tab[] = ['Student Information', 'Passport & Visa', 'Health Insurance', 'Academic Record', 'Recent Activity'];

const mockStudents: Record<string, {
  studentId: string; name: string; email: string;
  prefix: string; firstName: string; middleName: string; lastName: string;
  birthDate: string; country: string; program: string; degree: string;
  infoStatus: 'not_added' | 'complete'; missingCount: number;
  emergency: { fullName: string; email: string; phone: string; relationship: string };
  passport: { prefix: string; surname: string; middleName: string; birthDate: string; nationality: string; nationalityId: string; placeOfBirth: string; dateOfIssue: string; dateOfExpiry: string };
  visa: { passportNo: string; placeOfIssue: string; validFrom: string; validUntil: string; typeOfVisa: string; numberOfEntries: string };
  insurance: { companyName: string; startDate: string; endDate: string };
  activity: { date: string; type: string; detail: string; status: string }[];
}> = {
  '1': {
    studentId: '663380599-8', name: 'Thitikorn Suwanbutwipha', email: 'thitikorn.su@kkumail.com',
    prefix: 'Mr.', firstName: 'Thitikorn', middleName: '', lastName: 'Suwanbutwipha',
    birthDate: '01/01/0110', country: 'Vietnam', program: 'Geo-Informatics', degree: 'Ph.D.',
    infoStatus: 'not_added', missingCount: 2,
    emergency: { fullName: 'Mr.Thitikorn Suwanbutwipha', email: 'thitikorn.su@kkumail.com', phone: '0123456789', relationship: 'Advisor' },
    passport: { prefix: 'Mr', surname: 'Suwanbutwipha', middleName: '', birthDate: '01/01/0110', nationality: 'United States of America', nationalityId: '00000001', placeOfBirth: 'Thailand', dateOfIssue: '01/01/0110', dateOfExpiry: '01/01/0110' },
    visa: { passportNo: 'U4G234976', placeOfIssue: 'USA', validFrom: '01/01/0110', validUntil: '01/01/0110', typeOfVisa: 'ED', numberOfEntries: 'United States of America' },
    insurance: { companyName: 'Thai Life Insurance', startDate: 'October 1, 2023', endDate: 'October 1, 2024' },
    activity: [
      { date: '01/01/1001', type: 'Leave Request Form', detail: 'Staff of College Approved', status: 'Updated' },
      { date: '01/01/1001', type: 'Visa Added', detail: '', status: 'Updated' },
    ],
  },
};

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-primary/50">{label}</span>
          <span className="text-sm font-semibold text-primary">{value || '—'}</span>
        </div>
      ))}
    </div>
  );
}

export default function StaffStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Student Information');

  const s = mockStudents[id] ?? mockStudents['1'];
  const initials = s.name.split(' ').map(w => w[0]).join('').toUpperCase();

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200 shrink-0"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
            {initials}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-mono">{s.studentId}</p>
            <p className="text-xl font-semibold text-primary">{s.name}</p>
            <p className="text-xs text-gray-400">{s.email}</p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-gray-100 pb-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 rounded-t-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-primary'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1">

        {/* Student Information */}
        {activeTab === 'Student Information' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEFT: info grid */}
            <div className="flex-1 bg-secondary rounded-2xl p-6">
              <InfoGrid items={[
                { label: 'Prefix',      value: s.prefix },
                { label: 'First Name',  value: s.firstName },
                { label: 'Middle Name', value: s.middleName },
                { label: 'Last Name',   value: s.lastName },
                { label: 'Birth Date',  value: s.birthDate },
                { label: 'Country',     value: s.country },
                { label: 'Email',       value: s.email },
                { label: 'Program',     value: s.program },
                { label: 'Degree',      value: s.degree },
              ]} />
            </div>

            {/* RIGHT */}
            <div className="lg:w-80 shrink-0 flex flex-col gap-4">
              {/* Info Status Banner */}
              {s.infoStatus === 'not_added' ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-red-600 font-medium">
                    Has not added {s.missingCount} item{s.missingCount !== 1 ? 's' : ''} yet
                  </p>
                  <Button variant="warning" label="Follow Up" onClick={() => {}} />
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-sm text-green-700 font-medium">All information completed</p>
                </div>
              )}

              {/* Emergency Contact */}
              <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Emergency Contact</p>
                <InfoGrid items={[
                  { label: 'Full Name',     value: s.emergency.fullName },
                  { label: 'Email',         value: s.emergency.email },
                  { label: 'Phone',         value: s.emergency.phone },
                  { label: 'Relationship',  value: s.emergency.relationship },
                ]} />
              </div>
            </div>
          </div>
        )}

        {/* Passport & Visa */}
        {activeTab === 'Passport & Visa' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEFT: Passport */}
            <div className="flex-1 bg-secondary rounded-2xl p-6 flex flex-col gap-4">
              <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Passport Information</p>
              <InfoGrid items={[
                { label: 'Prefix',          value: s.passport.prefix },
                { label: 'Surname',         value: s.passport.surname },
                { label: 'Middle Name',     value: s.passport.middleName },
                { label: 'Birth Date',      value: s.passport.birthDate },
                { label: 'Nationality',     value: s.passport.nationality },
                { label: 'Nationality ID',  value: s.passport.nationalityId },
                { label: 'Place of Birth',  value: s.passport.placeOfBirth },
                { label: 'Date of Issue',   value: s.passport.dateOfIssue },
                { label: 'Date of Expiry',  value: s.passport.dateOfExpiry },
              ]} />
              <div className="mt-2 w-full h-40 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                Passport Image
              </div>
            </div>

            {/* RIGHT: Visa */}
            <div className="flex-1 bg-secondary rounded-2xl p-6 flex flex-col gap-4">
              <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Visa Information</p>
              <InfoGrid items={[
                { label: 'Passport No.',      value: s.visa.passportNo },
                { label: 'Place of Issue',    value: s.visa.placeOfIssue },
                { label: 'Valid From',        value: s.visa.validFrom },
                { label: 'Valid Until',       value: s.visa.validUntil },
                { label: 'Type of Visa',      value: s.visa.typeOfVisa },
                { label: 'Number of Entries', value: s.visa.numberOfEntries },
              ]} />
              <div className="mt-2 w-full h-32 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                Visa Stamp 1
              </div>
              <div className="w-full h-32 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                Visa Stamp 2
              </div>
            </div>
          </div>
        )}

        {/* Health Insurance */}
        {activeTab === 'Health Insurance' && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 bg-secondary rounded-2xl p-6 flex flex-col gap-4">
              <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Insurance Information</p>
              <InfoGrid items={[
                { label: 'Insurance Company Name', value: s.insurance.companyName },
                { label: 'Start Date',             value: s.insurance.startDate },
                { label: 'End Date',               value: s.insurance.endDate },
              ]} />
            </div>
            <div className="lg:w-64 shrink-0 bg-primary rounded-2xl p-6 flex flex-col gap-3 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Insurance Card</p>
              <p className="text-lg font-bold">{s.insurance.companyName}</p>
              <p className="text-sm font-medium">{s.name}</p>
              <div className="mt-auto flex flex-col gap-1 text-xs opacity-70">
                <span>Start: {s.insurance.startDate}</span>
                <span>End: {s.insurance.endDate}</span>
              </div>
            </div>
          </div>
        )}

        {/* Academic Record */}
        {activeTab === 'Academic Record' && (
          <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-sm font-semibold text-primary">Transcript</p>
            <div className="w-full h-64 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
              Document Preview
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {activeTab === 'Recent Activity' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Document Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Detail</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {s.activity.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{a.date}</td>
                    <td className="py-3 px-4 text-primary font-medium">{a.type}</td>
                    <td className="py-3 px-4 text-primary">{a.detail || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button variant="info" onClick={() => {}} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
