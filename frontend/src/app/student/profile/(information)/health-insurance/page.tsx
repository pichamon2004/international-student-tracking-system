'use client';

import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';

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

const mock = {
  provider: 'Krungthai-AXA',
  policyNo: 'KTA-2024-88901',
  coverage: '40,000 THB',
  validFrom: '01 Jan 2024',
  validUntil: '31 Dec 2024',
};

export default function HealthInsurancePage() {
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
          <h1 className="text-2xl font-semibold text-primary flex-1">My Health Insurance</h1>
          <button
            onClick={() => router.push('/student/profile/updatehealth-insurance')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Edit
          </button>
        </div>
        {/* Provider + Policy No */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Insurance Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoRow label="Provider" value={mock.provider} />
            <InfoRow label="Policy No." value={mock.policyNo} />
            <InfoRow label="Coverage" value={mock.coverage} />
            <InfoRow label="Valid From" value={mock.validFrom} />
            <InfoRow label="Valid Until" value={mock.validUntil} />
            <div className="flex flex-col gap-0.5">
              <span className={labelCls}>Remaining</span>
              {(() => {
                const days = daysRemaining(mock.validUntil);
                const status = days < 14 ? 'critical' : days <= 45 ? 'warning' : 'normal';
                return (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full w-fit ${status === 'critical' ? 'bg-red-100 text-red-600' : status === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-700'}`}>
                    {days} days
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Insurance card image placeholder */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">Insurance Card</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl min-h-52 text-gray-400 text-sm col-span-1">
              Insurance Card Image
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
