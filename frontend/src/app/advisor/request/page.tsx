'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { RiSearchLine } from 'react-icons/ri';
import { clsx } from 'clsx';

type Status = 'Pending' | 'Approved' | 'Rejected';

const mockRequests = [
  { id: 1, name: 'Joanna Sofia', documentType: 'Travel Letter',      submissionDate: '01/01/1001', status: 'Pending'  as Status },
  { id: 2, name: 'Liu Chen',     documentType: 'Visa Extension',     submissionDate: '02/03/2025', status: 'Approved' as Status },
  { id: 3, name: 'Aung Kyaw',   documentType: 'Enrollment Letter',  submissionDate: '05/03/2025', status: 'Rejected' as Status },
  { id: 4, name: 'Maria Santos', documentType: 'Travel Letter',      submissionDate: '10/03/2025', status: 'Pending'  as Status },
];

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'] as const;
type FilterType = typeof STATUS_FILTERS[number];

export default function AdvisorRequestPage() {
  const router = useRouter();
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterType>('All');

  const filtered = mockRequests.filter(req => {
    const matchStatus = filter === 'All' || req.status === filter;
    const q = search.toLowerCase();
    const matchSearch = req.name.toLowerCase().includes(q) || req.documentType.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">
      <p className="text-2xl font-semibold text-primary">Request Management</p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 w-full">

        {/* Search */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 bg-gray-50 focus-within:border-primary transition-colors">
          <RiSearchLine size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search name or document..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                filter === s
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-t">
          <colgroup>
            <col />
            <col />
            <col />
            <col className="w-36" />
            <col className="w-72" />
          </colgroup>
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">No requests found</td>
              </tr>
            ) : (
              filtered.map((req) => (
                <tr key={req.id} className="border-b last:border-none hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-primary">{req.name}</td>
                  <td className="py-3 px-4 text-primary">{req.documentType}</td>
                  <td className="py-3 px-4 text-primary">{req.submissionDate}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-4 w-px whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {req.status === 'Pending' ? (
                        <>
                          <Button variant="danger"  onClick={() => {}} />
                          <Button variant="info"    onClick={() => router.push(`/advisor/request/${req.id}`)} />
                          <Button variant="success" onClick={() => {}} />
                        </>
                      ) : (
                        <Button variant="info" onClick={() => router.push(`/advisor/request/${req.id}`)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
