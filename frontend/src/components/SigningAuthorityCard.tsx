'use client';

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { RiUser3Line, RiUserStarLine, RiShieldUserLine } from 'react-icons/ri';
import {
  deanApi,
  type ApiDeanDelegation,
  type ApiDelegateCandidate,
  type ApiDeanSignatory,
  type ApiDelegationStatus,
} from '@/lib/api';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';
import { fmtDay, fmtUntil, todayYmd, delegationStart, delegationEnd } from '@/lib/delegationDates';
import toast from 'react-hot-toast';

const STATUS_STYLE: Record<ApiDelegationStatus, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Active',    cls: 'bg-orange-100 text-orange-600' },
  SCHEDULED: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-600' },
  EXPIRED:   { label: 'Expired',   cls: 'bg-gray-100 text-gray-500' },
  REVOKED:   { label: 'Revoked',   cls: 'bg-red-50 text-red-500' },
};


const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

// IR staff decide which executive (an advisor with an administrative position)
// signs for the dean, and for which period. Every delegation is kept as history.
export default function SigningAuthorityCard() {
  const [signatory, setSignatory] = useState<ApiDeanSignatory | null>(null);
  const [delegations, setDelegations] = useState<ApiDeanDelegation[]>([]);
  const [candidates, setCandidates] = useState<ApiDelegateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [delegateId, setDelegateId] = useState('');
  // Whole days: the delegation runs from the start of startDate to the end of endDate
  const [startDate, setStartDate] = useState(todayYmd);
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');

  const reload = useCallback(() =>
    Promise.all([deanApi.getSignatory(), deanApi.listDelegations()])
      .then(([sigRes, listRes]) => {
        setSignatory(sigRes.data.data);
        setDelegations(listRes.data.data);
      })
      .catch(() => {}), []);

  useEffect(() => {
    Promise.all([reload(), deanApi.getDelegateUsers().then(res => setCandidates(res.data.data)).catch(() => {})])
      .finally(() => setLoading(false));
  }, [reload]);

  const current = delegations.find(d => d.status === 'ACTIVE') ?? null;

  const handleCreate = async () => {
    if (!delegateId) return;
    if (!startDate) { toast.error('Choose a start date'); return; }
    if (endDate && endDate < startDate) { toast.error('The end date cannot be before the start date'); return; }
    setSaving(true);
    try {
      await deanApi.createDelegation({
        delegateId: Number(delegateId),
        startAt: delegationStart(startDate).toISOString(),
        endAt: endDate ? delegationEnd(endDate).toISOString() : undefined,
        note: note.trim() || undefined,
      });
      toast.success('Delegation saved');
      setDelegateId(''); setEndDate(''); setNote(''); setStartDate(todayYmd());
      await reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save delegation'));
    } finally { setSaving(false); }
  };

  const handleRevoke = async (d: ApiDeanDelegation) => {
    if (!window.confirm(`Revoke ${d.delegate.name}'s delegation? They will stop signing for the Dean immediately.`)) return;
    setSaving(true);
    try {
      await deanApi.revokeDelegation(d.id);
      toast.success('Delegation revoked');
      await reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to revoke delegation'));
    } finally { setSaving(false); }
  };

  const options = candidates.map(c => ({
    label: c.position ? `${c.name} — ${c.position}` : c.name,
    value: String(c.id),
  }));
  const deanName = signatory?.deanName || 'the Dean';
  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="bg-white rounded-2xl shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <RiShieldUserLine className="text-primary text-xl" />
          <span className="font-semibold text-primary text-base">Dean Signing Authority</span>
        </div>
        {!loading && (
          <span className={clsx(
            'text-xs font-semibold px-3 py-1 rounded-full',
            signatory?.isDelegated ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'
          )}>
            {signatory?.isDelegated ? 'Delegated' : 'Dean (self)'}
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">

        {/* Who signs right now */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-6">
          <div className={clsx(
            'w-14 h-14 rounded-full flex items-center justify-center text-2xl',
            signatory?.isDelegated ? 'bg-orange-100 text-orange-500' : 'bg-primary/10 text-primary'
          )}>
            {signatory?.isDelegated ? <RiUserStarLine /> : <RiUser3Line />}
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Currently signing as Dean</p>
            {loading ? (
              <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-base font-semibold text-gray-800">{signatory?.name ?? '—'}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {signatory?.isDelegated
                ? `${signatory.position ?? 'Executive'} · acting for ${deanName}`
                : 'Primary signatory'}
            </p>
            {signatory?.isDelegated && (
              <p className="text-xs text-gray-500 mt-1">
                {signatory.endAt ? `Until ${fmtUntil(signatory.endAt)}` : 'Until revoked'}
              </p>
            )}
          </div>
          {current && (
            <button
              onClick={() => handleRevoke(current)}
              disabled={saving}
              className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition disabled:opacity-40"
            >
              Revoke now
            </button>
          )}
        </div>

        {/* New delegation */}
        <div className="flex-1 flex flex-col gap-3 px-6 py-6">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">New Delegation</p>
          <CustomSelect
            value={delegateId}
            onChange={setDelegateId}
            options={options}
            placeholder={options.length ? 'Select executive…' : 'No executives yet'}
          />
          {!loading && options.length === 0 && (
            <p className="text-[11px] text-gray-400">
              Add an administrative position to a teacher in Teacher Management to make them selectable.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Start date</span>
              <DateSelect value={startDate} onChange={setStartDate} placeholder="Select date" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">End date <span className="text-gray-300">(optional)</span></span>
              <DateSelect value={endDate} onChange={setEndDate} placeholder="Until revoked" />
            </div>
          </div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note (optional), e.g. Dean abroad for conference"
            className={inputCls}
          />
          <button
            onClick={handleCreate}
            disabled={!delegateId || saving}
            className="self-end px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </div>

      {/* History */}
      <div className="border-t border-gray-100 px-6 py-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Delegation History</p>
        {loading ? (
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        ) : delegations.length === 0 ? (
          <p className="text-sm text-gray-400">No delegations yet — the Dean signs everything themselves.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2 pr-4 font-semibold">Executive</th>
                  <th className="py-2 pr-4 font-semibold">Period</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Set by</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {delegations.map(d => (
                  <tr key={d.id} className="align-top">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-800">{d.delegate.name}</p>
                      {d.delegate.position && <p className="text-xs text-gray-400">{d.delegate.position}</p>}
                      {d.note && <p className="text-xs text-gray-500 mt-0.5 italic">{d.note}</p>}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-600 whitespace-nowrap">
                      {fmtDay(d.startAt)}<br />→ {d.endAt ? fmtUntil(d.endAt) : 'until revoked'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_STYLE[d.status].cls)}>
                        {STATUS_STYLE[d.status].label}
                      </span>
                      {d.revokedAt && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          {fmtDay(d.revokedAt)}{d.revokedBy ? ` by ${d.revokedBy.name}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-600">{d.createdBy.name}</td>
                    <td className="py-2.5 text-right">
                      {(d.status === 'ACTIVE' || d.status === 'SCHEDULED') && (
                        <button
                          onClick={() => handleRevoke(d)}
                          disabled={saving}
                          className="text-xs font-medium text-red-500 hover:underline disabled:opacity-40"
                        >
                          Revoke
                        </button>
                      )}
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
