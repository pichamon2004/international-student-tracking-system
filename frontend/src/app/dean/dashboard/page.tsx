'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { RiUser3Line, RiUserStarLine, RiShieldUserLine, RiArrowRightLine, RiFileList3Line } from 'react-icons/ri';
import { requestApi, deanApi, type ApiRequest, type ApiDeanSignatory } from '@/lib/api';
import { fmtUntil } from '@/lib/delegationDates';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth';

const statusConfig: Record<string, { label: string; className: string }> = {
  FORWARDED_TO_DEAN: { label: 'Pending',  className: 'bg-purple-100 text-purple-700' },
  DEAN_APPROVED:     { label: 'Approved', className: 'bg-green-100 text-green-700' },
  DEAN_REJECTED:     { label: 'Rejected', className: 'bg-red-100 text-red-600' },
};

export default function DeanDashboardPage() {
  const router = useRouter();
  const { activeRole, user, fetchMe } = useAuthStore();
  const isViceDean = activeRole === 'VICE_DEAN';
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Delegation is managed by IR staff — both the dean and an executive only see who signs.
  const [signatory, setSignatory] = useState<ApiDeanSignatory | null>(null);
  const [sigLoading, setSigLoading] = useState(true);

  useEffect(() => {
    if (isViceDean && !user) fetchMe();
  }, [isViceDean, user, fetchMe]);

  useEffect(() => {
    requestApi.getAll()
      .then(res => setRequests(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    deanApi.getSignatory()
      .then(res => setSignatory(res.data.data))
      .catch(() => {})
      .finally(() => setSigLoading(false));
  }, []);

  const pending = requests.filter(r => r.status === 'FORWARDED_TO_DEAN');
  const recent = requests.slice(0, 8);

  const deanName = signatory?.deanName || 'the Dean';
  const untilText = signatory?.endAt
    ? `Until ${fmtUntil(signatory.endAt)}`
    : 'Until revoked';
  const isDelegated = !!signatory?.isDelegated;
  // Wait for `user` so "is this delegation actually mine" isn't a false negative
  const isMine = isViceDean && isDelegated && !!user && signatory?.id === user.id;

  const badge = isViceDean
    ? isMine ? { label: 'Acting Dean', cls: 'bg-orange-100 text-orange-600' } : { label: 'Not Delegated', cls: 'bg-gray-100 text-gray-500' }
    : isDelegated ? { label: 'Delegated', cls: 'bg-orange-100 text-orange-600' } : { label: 'Dean (self)', cls: 'bg-green-100 text-green-700' };

  return (
    <div className="flex flex-col gap-5 w-full flex-1 min-h-0">

      {/* ── Top row: stat card + signing authority ── */}
      <div className="grid grid-cols-5 gap-5">

        {/* Stat card */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="h-1.5 bg-primary" />
          <div className="flex flex-col justify-between flex-1 px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pending Approval</p>
                <p className="text-5xl font-bold text-primary mt-2 leading-none">
                  {loading ? <span className="text-gray-200 animate-pulse">—</span> : pending.length}
                </p>
                <p className="text-sm text-gray-400 mt-2">requests awaiting your approval</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <RiFileList3Line className="text-primary text-2xl" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={() => router.push('/dean/request')}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all"
              >
                View all requests <RiArrowRightLine size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Signing authority card (read-only) */}
        <div className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <RiShieldUserLine className="text-primary text-xl" />
              <span className="font-semibold text-primary text-base">Signing Authority</span>
            </div>
            {!sigLoading && (
              <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full', badge.cls)}>{badge.label}</span>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-6 text-center">
            <div className={clsx(
              'w-14 h-14 rounded-full flex items-center justify-center text-2xl',
              (isViceDean ? isMine : isDelegated) ? 'bg-orange-100 text-orange-500'
                : isViceDean ? 'bg-gray-100 text-gray-400' : 'bg-primary/10 text-primary'
            )}>
              {isDelegated ? <RiUserStarLine /> : <RiUser3Line />}
            </div>
            {sigLoading || (isViceDean && !user) ? (
              <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
            ) : isViceDean ? (
              isMine ? (
                <>
                  <p className="text-base font-semibold text-gray-800">You are acting on behalf of {deanName}</p>
                  {signatory?.position && <p className="text-xs text-gray-500">{signatory.position}</p>}
                  <p className="text-xs font-medium text-orange-600">{untilText}</p>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Requests forwarded to the Dean appear below while this assignment is active.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-800">No active delegation right now</p>
                  <p className="text-xs text-gray-400 max-w-sm">
                    You&apos;ll see requests here once IR staff assign you to sign for {deanName}.
                  </p>
                </>
              )
            ) : isDelegated ? (
              <>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Currently signing for you</p>
                <p className="text-base font-semibold text-gray-800">{signatory?.name}</p>
                {signatory?.position && <p className="text-xs text-gray-500">{signatory.position}</p>}
                <p className="text-xs font-medium text-orange-600">{untilText}</p>
              </>
            ) : (
              <>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Currently signing as</p>
                <p className="text-base font-semibold text-gray-800">You (Dean)</p>
              </>
            )}
            {!isViceDean && (
              <p className="text-xs text-gray-400 mt-1">Delegation is managed by IR Staff.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent requests (full width, fills remaining height) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-primary text-base">Recent Requests</p>
          <button
            onClick={() => router.push('/dean/request')}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            View all <RiArrowRightLine size={13} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 px-6 py-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No requests yet
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50/90 backdrop-blur-sm">
                <th className="text-left py-3 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wide">Student</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Document Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-center py-3 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map(req => {
                const cfg = statusConfig[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-500' };
                const name = [req.student?.firstNameEn, req.student?.lastNameEn].filter(Boolean).join(' ') || '—';
                const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                return (
                  <tr key={req.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-6">
                      <span className="font-medium text-gray-800">{name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{req.requestType?.name ?? req.title}</td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs">{date}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', cfg.className)}>{cfg.label}</span>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <Button variant="info" onClick={() => router.push(`/dean/request/${req.id}`)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
