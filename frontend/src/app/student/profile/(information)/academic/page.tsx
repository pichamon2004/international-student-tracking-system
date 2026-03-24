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
  docType: 'Transcript',
  institution: 'Khon Kaen University',
  issueDate: '15 May 2023',
};

export default function AcademicPage() {
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
          <h1 className="text-2xl font-semibold text-primary flex-1">Academic Document</h1>
          <button
            onClick={() => router.push('/student/profile/updateacademic')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Edit
          </button>
        </div>
        {/* Fields */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Document Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoRow label="Document Type" value={mock.docType} />
            <InfoRow label="Institution" value={mock.institution} />
            <InfoRow label="Issue Date" value={mock.issueDate} />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Document image placeholder */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Document Images</p>
          <div className="flex gap-4">
            <div className="w-40 h-52 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 text-xs">
              Document Image
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
