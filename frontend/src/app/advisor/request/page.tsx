'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { RiSearchLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { requestApi, type ApiRequest } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'] as const;
type FilterType = typeof STATUS_FILTERS[number];

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:              { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  FORWARDED_TO_ADVISOR: { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  ADVISOR_APPROVED:     { label: 'Approved', className: 'bg-green-100 text-green-700' },
  ADVISOR_REJECTED:     { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  STAFF_APPROVED:       { label: 'Approved', className: 'bg-green-100 text-green-700' },
  FORWARDED_TO_DEAN:    { label: 'Approved', className: 'bg-green-100 text-green-700' },
  DEAN_APPROVED:        { label: 'Approved', className: 'bg-green-100 text-green-700' },
  STAFF_REJECTED:       { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  DEAN_REJECTED:        { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  CANCELLED:            { label: 'Rejected', className: 'bg-red-100 text-red-600' },
};

function displayFilter(status: string): FilterType {
  const label = statusConfig[status]?.label ?? 'Pending';
  return label as FilterType;
}

export default function AdvisorRequestPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await requestApi.getAll();
      setRequests(res.data.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = requests.filter(req => {
    const q = search.toLowerCase();
    const studentName = [req.student?.firstNameEn, req.student?.lastNameEn].filter(Boolean).join(' ').toLowerCase();
    const docType = req.requestType?.name?.toLowerCase() ?? req.title.toLowerCase();
    const matchSearch = studentName.includes(q) || docType.includes(q);
    const matchFilter = filter === 'All' || displayFilter(req.status) === filter;
    return matchSearch && matchFilter;
  });

  async function updateStatus(id: number, status: string) {
    try {
      await requestApi.updateStatus(id, status);
      toast.success('Status updated');
      load();
    } catch {
      toast.error('Failed to update status');
    }
  }

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">
      <p className="text-2xl font-semibold text-primary">Request Management</p>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 w-full">
        <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:border-primary transition-colors">
          <RiSearchLine size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search name or document..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
                filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[560px] w-full text-sm border-t">
          <thead>
            <tr className="border-b">
              <th className="text-left   py-4 px-4 font-semibold text-primary">Name</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Document Type</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Submission Date</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Status</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b animate-pulse">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">No requests found</td>
              </tr>
            ) : filtered.map(req => {
              const cfg = statusConfig[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-500' };
              const studentName = [req.student?.firstNameEn, req.student?.lastNameEn].filter(Boolean).join(' ') || '—';
              const isPending = req.status === 'FORWARDED_TO_ADVISOR';
              return (
                <tr key={req.id} className="border-b last:border-none hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-primary">{studentName}</td>
                  <td className="py-3 px-4 text-primary">{req.requestType?.name ?? req.title}</td>
                  <td className="py-3 px-4 text-primary">{new Date(req.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', cfg.className)}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 w-px whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="info" onClick={() => router.push(`/advisor/request/${req.id}`)} />
                      {isPending && (
                        <>
                          <Button variant="success" label="Approve" onClick={() => updateStatus(req.id, 'ADVISOR_APPROVED')} />
                          <Button variant="danger"  label="Reject"  onClick={() => updateStatus(req.id, 'ADVISOR_REJECTED')} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
