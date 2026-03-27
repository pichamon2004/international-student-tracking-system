'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine } from 'react-icons/ri';
import { studentMeApi, healthInsuranceApi, type ApiHealthInsurance } from '@/lib/api';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

function daysRemaining(expiryDate: string): number {
  return Math.max(0, Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000));
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const labelCls = 'text-xs font-medium text-primary/70';

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelCls}>{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '—'}</span>
    </div>
  );
}

export default function HealthInsurancePage() {
  const router = useRouter();
  const [insurances, setInsurances] = useState<ApiHealthInsurance[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        setStudentId(s.id);
        return healthInsuranceApi.getAll(s.id);
      })
      .then(res => setInsurances(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function remove(insuranceId: number) {
    if (!studentId) return;
    try {
      await healthInsuranceApi.delete(studentId, insuranceId);
      setInsurances(prev => prev.filter(i => i.id !== insuranceId));
      toast.success('Insurance removed');
    } catch {
      toast.error('Failed to remove insurance');
    }
  }

  const current = insurances[0]; // show first (sorted by expiryDate asc from backend)

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
          <h1 className="text-2xl font-semibold text-primary flex-1">My Health Insurance</h1>
          <button
            onClick={() => router.push('/student/profile/updatehealth-insurance')}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            {insurances.length > 0 ? 'Edit' : 'Add'}
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
          </div>
        ) : !current ? (
          <p className="text-sm text-gray-400 text-center py-4">No health insurance added yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">Insurance Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InfoRow label="Provider" value={current.provider} />
                <InfoRow label="Policy No." value={current.policyNumber} />
                <InfoRow label="Coverage Type" value={current.coverageType} />
                <InfoRow label="Valid From" value={fmtDate(current.startDate)} />
                <InfoRow label="Valid Until" value={fmtDate(current.expiryDate)} />
                <div className="flex flex-col gap-0.5">
                  <span className={labelCls}>Remaining</span>
                  {(() => {
                    const days = daysRemaining(current.expiryDate);
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

            {insurances.length > 1 && (
              <>
                <hr className="border-gray-100" />
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-gray-700">All Insurance Records ({insurances.length})</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Provider</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Policy No.</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Valid From</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Valid Until</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-primary/60">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insurances.map(ins => (
                          <tr key={ins.id} className="border-b border-gray-100 last:border-none">
                            <td className="py-2.5 px-3 text-primary">{ins.provider}</td>
                            <td className="py-2.5 px-3 text-gray-500">{ins.policyNumber || '—'}</td>
                            <td className="py-2.5 px-3 text-gray-500">{fmtDate(ins.startDate)}</td>
                            <td className="py-2.5 px-3 text-gray-500">{fmtDate(ins.expiryDate)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <Button onClick={() => remove(ins.id)} variant='danger' label='Remove' />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            <hr className="border-gray-100" />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">Insurance Card</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl min-h-52 text-gray-400 text-sm col-span-1 overflow-hidden">
                  {current.fileUrl ? (
                    <img src={current.fileUrl} alt="Insurance card" className="w-full h-full object-contain" />
                  ) : (
                    'Insurance Card Image'
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
