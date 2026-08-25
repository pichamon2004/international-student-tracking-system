'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { RiUser3Line, RiUserStarLine, RiShieldUserLine, RiArrowRightLine, RiFileList3Line } from 'react-icons/ri';
import { requestApi, deanApi, type ApiRequest, type ApiDeanDelegation } from '@/lib/api';
import CustomSelect from '@/components/ui/CustomSelect';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth';
import toast from 'react-hot-toast';

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

  const [delegation, setDelegation] = useState<ApiDeanDelegation | null>(null);
  const [delegateUsers, setDelegateUsers] = useState<{ id: number; name: string }[]>([]);
  const [selectedDelegateId, setSelectedDelegateId] = useState('');
  const [delegLoading, setDelegLoading] = useState(true);
  const [delegSaving, setDelegSaving] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [deanName, setDeanName] = useState('');
  const [isCurrentlyDelegated, setIsCurrentlyDelegated] = useState(false);

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
    // Vice deans don't manage delegation (DEAN-only endpoints) — just show
    // who they're currently signing on behalf of. Wait for `user` so the
    // "is this delegation actually mine" check below isn't a false negative.
    if (isViceDean) {
      if (!user) return;
      deanApi.getSignatory()
        .then(res => {
          const sig = res.data.data;
          setIsCurrentlyDelegated(sig.isDelegated && sig.id === user.id);
          setDeanName(sig.deanName);
        })
        .catch(() => {})
        .finally(() => setDelegLoading(false));
      return;
    }
    Promise.all([deanApi.getDelegation(), deanApi.getDelegateUsers()])
      .then(([delRes, usersRes]) => {
        setDelegation(delRes.data.data);
        setDelegateUsers(usersRes.data.data);
      })
      .catch(() => {})
      .finally(() => setDelegLoading(false));
  }, [isViceDean, user]);

  const handleDelegate = async () => {
    if (!selectedDelegateId) return;
    setDelegSaving(true);
    try {
      const res = await deanApi.setDelegate(Number(selectedDelegateId));
      setDelegation(res.data.data);
      setSelectedDelegateId('');
      setIsChanging(false);
      toast.success('Delegation set successfully');
    } catch { toast.error('Failed to set delegate'); }
    finally { setDelegSaving(false); }
  };

  const handleToggle = async (isActive: boolean) => {
    setDelegSaving(true);
    try {
      const res = await deanApi.toggleDelegation(isActive);
      setDelegation(res.data.data);
      toast.success(isActive ? 'Delegation activated' : 'Delegation deactivated');
    } catch { toast.error('Failed to update delegation'); }
    finally { setDelegSaving(false); }
  };

  const pending = requests.filter(r => r.status === 'FORWARDED_TO_DEAN');
  const recent = requests.slice(0, 8);

  const signatoryName = delegation?.isActive ? delegation.delegate.name : null;
  const delegateOptions = delegateUsers.map(u => ({ label: u.name, value: String(u.id) }));

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

        {/* Signing authority card */}
        <div className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <RiShieldUserLine className="text-primary text-xl" />
              <span className="font-semibold text-primary text-base">Signing Authority</span>
            </div>
            {!delegLoading && (
              <span className={clsx(
                'text-xs font-semibold px-3 py-1 rounded-full',
                isViceDean
                  ? isCurrentlyDelegated ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                  : delegation?.isActive ? 'bg-orange-100 text-orange-600'
                  : 'bg-green-100 text-green-700'
              )}>
                {isViceDean
                  ? isCurrentlyDelegated ? 'Acting Dean' : 'Not Delegated'
                  : delegation?.isActive ? 'Delegated' : 'Dean (self)'}
              </span>
            )}
          </div>

          {isViceDean ? (
            /* ── Vice dean: read-only, no delegation controls ── */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-6 text-center">
              <div className={clsx(
                'w-14 h-14 rounded-full flex items-center justify-center text-2xl',
                isCurrentlyDelegated ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'
              )}>
                <RiUserStarLine />
              </div>
              {delegLoading ? (
                <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
              ) : isCurrentlyDelegated ? (
                <>
                  <p className="text-base font-semibold text-gray-800">You are acting on behalf of {deanName || 'the Dean'}</p>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Requests forwarded to the Dean will appear below while this assignment is active.
                    Only the Dean can change who this delegation is assigned to.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-gray-800">No active delegation right now</p>
                  <p className="text-xs text-gray-400 max-w-sm">
                    {deanName || 'The Dean'} hasn&apos;t delegated approval authority to you at the moment —
                    you&apos;ll see requests here once they do.
                  </p>
                </>
              )}
            </div>
          ) : (
          <>
          {/* Card body — horizontal split */}
          <div className="flex flex-1 divide-x divide-gray-100">

            {/* Left: current signatory */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-6">
              <div className={clsx(
                'w-14 h-14 rounded-full flex items-center justify-center text-2xl',
                delegation?.isActive ? 'bg-orange-100 text-orange-500' : 'bg-primary/10 text-primary'
              )}>
                {delegation?.isActive ? <RiUserStarLine /> : <RiUser3Line />}
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Currently signing as</p>
                {delegLoading ? (
                  <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mx-auto" />
                ) : (
                  <p className="text-base font-semibold text-gray-800">
                    {signatoryName ?? 'You (Dean)'}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {delegation?.isActive ? 'Acting delegate' : 'Primary signatory'}
                </p>
              </div>
            </div>

            {/* Right: delegation controls */}
            <div className="flex-1 flex flex-col justify-center gap-4 px-6 py-6">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Delegation Control</p>

              {delegLoading ? (
                <div className="flex flex-col gap-2">
                  <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-9 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              ) : !delegation ? (
                /* ── No delegation yet ── */
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    You are the current signing authority.<br />Select a person to delegate signing.
                  </p>
                  <div className="flex gap-2">
                    <CustomSelect
                      value={selectedDelegateId}
                      onChange={setSelectedDelegateId}
                      options={delegateOptions}
                      placeholder="Select delegate…"
                      className="flex-1"
                    />
                    <button
                      onClick={handleDelegate}
                      disabled={!selectedDelegateId || delegSaving}
                      className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition disabled:opacity-40 shrink-0"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : isChanging ? (
                /* ── Change delegate ── */
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-400">Select a new signing delegate</p>
                  <div className="flex gap-2">
                    <CustomSelect
                      value={selectedDelegateId}
                      onChange={setSelectedDelegateId}
                      options={delegateOptions}
                      placeholder="Select delegate…"
                      className="flex-1"
                    />
                    <button
                      onClick={handleDelegate}
                      disabled={!selectedDelegateId || delegSaving}
                      className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition disabled:opacity-40 shrink-0"
                    >
                      Confirm
                    </button>
                  </div>
                  <button
                    onClick={() => { setIsChanging(false); setSelectedDelegateId(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition text-left"
                  >
                    Cancel
                  </button>
                </div>
              ) : delegation.isActive ? (
                /* ── Active delegation ── */
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                    <RiUserStarLine className="text-orange-400 shrink-0" size={16} />
                    <span className="text-sm font-semibold text-orange-700 truncate flex-1">{delegation.delegate.name}</span>
                    <span className="text-[10px] bg-orange-200 text-orange-600 rounded-full px-2 py-0.5 shrink-0 font-medium">active</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggle(false)}
                      disabled={delegSaving}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition disabled:opacity-40"
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => { setIsChanging(true); setSelectedDelegateId(''); }}
                      disabled={delegSaving}
                      className="flex-1 py-2 bg-primary/10 text-primary text-sm font-medium rounded-xl hover:bg-primary/20 transition disabled:opacity-40"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Inactive delegation ── */
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <RiUserStarLine className="text-gray-400 shrink-0" size={16} />
                    <span className="text-sm text-gray-500 truncate flex-1">{delegation.delegate.name}</span>
                    <span className="text-[10px] bg-gray-200 text-gray-500 rounded-full px-2 py-0.5 shrink-0 font-medium">inactive</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggle(true)}
                      disabled={delegSaving}
                      className="flex-1 py-2 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition disabled:opacity-40"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => { setIsChanging(true); setSelectedDelegateId(''); }}
                      disabled={delegSaving}
                      className="flex-1 py-2 bg-primary/10 text-primary text-sm font-medium rounded-xl hover:bg-primary/20 transition disabled:opacity-40"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
          )}
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
