'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { RiSearchLine } from 'react-icons/ri';
import { clsx } from 'clsx';

type RequestStatus =
  | 'PENDING'
  | 'FORWARDED_TO_ADVISOR'
  | 'ADVISOR_APPROVED'
  | 'ADVISOR_REJECTED'
  | 'STAFF_APPROVED'
  | 'FORWARDED_TO_DEAN'
  | 'DEAN_APPROVED'
  | 'STAFF_REJECTED'
  | 'DEAN_REJECTED'
  | 'CANCELLED';

interface Request {
  id: number;
  name: string;
  documentType: string;
  submissionDate: string;
  status: RequestStatus;
  note?: string;
}

const mockRequests: Request[] = [
  { id: 1, name: 'Joanna Sofia',   documentType: 'Travel Letter',      submissionDate: '01/01/1001', status: 'PENDING' },
  { id: 2, name: 'Cristina Sofia', documentType: 'Transcript',         submissionDate: '01/01/1001', status: 'FORWARDED_TO_ADVISOR' },
  { id: 3, name: 'Cristina Sofia', documentType: 'Transcript',         submissionDate: '01/01/1001', status: 'ADVISOR_APPROVED' },
  { id: 4, name: 'Monica Sofia',   documentType: 'Leave Request Form', submissionDate: '01/01/1001', status: 'STAFF_APPROVED' },
  { id: 5, name: 'Joanna Sofia',   documentType: 'Enrollment Letter',  submissionDate: '01/01/1001', status: 'FORWARDED_TO_DEAN' },
  { id: 6, name: 'Monica Sofia',   documentType: 'Leave Request Form', submissionDate: '01/01/1001', status: 'DEAN_APPROVED',  note: '-' },
  { id: 7, name: 'Monica Sofia',   documentType: 'Leave Request Form', submissionDate: '01/01/1001', status: 'CANCELLED',     note: 'Incomplete document' },
];

const DONE_STATUSES: RequestStatus[] = ['DEAN_APPROVED', 'STAFF_REJECTED', 'DEAN_REJECTED', 'CANCELLED'];
const isDone = (s: RequestStatus) => DONE_STATUSES.includes(s);

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  PENDING:              { label: 'รออนุมัติ',           className: 'bg-yellow-100 text-yellow-700' },
  FORWARDED_TO_ADVISOR: { label: 'ส่งให้อาจารย์แล้ว',    className: 'bg-blue-100 text-blue-700' },
  ADVISOR_APPROVED:     { label: 'อาจารย์อนุมัติแล้ว',   className: 'bg-teal-100 text-teal-700' },
  ADVISOR_REJECTED:     { label: 'อาจารย์ปฏิเสธ',        className: 'bg-orange-100 text-orange-700' },
  STAFF_APPROVED:       { label: 'คณะอนุมัติแล้ว',       className: 'bg-indigo-100 text-indigo-700' },
  FORWARDED_TO_DEAN:    { label: 'ส่งให้ Dean แล้ว',      className: 'bg-purple-100 text-purple-700' },
  DEAN_APPROVED:        { label: 'สมบูรณ์',              className: 'bg-green-100 text-green-700' },
  STAFF_REJECTED:       { label: 'ยกเลิก',               className: 'bg-red-100 text-red-600' },
  DEAN_REJECTED:        { label: 'ยกเลิก',               className: 'bg-red-100 text-red-600' },
  CANCELLED:            { label: 'ยกเลิก',               className: 'bg-red-100 text-red-600' },
};

const STATUS_FILTERS = ['All', 'Active', 'Done'] as const;
type FilterType = typeof STATUS_FILTERS[number];

export default function StaffRequestPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');

  const filtered = mockRequests.filter(req => {
    const q = search.toLowerCase();
    const matchSearch = req.name.toLowerCase().includes(q) || req.documentType.toLowerCase().includes(q);
    const matchFilter =
      filter === 'All' ||
      (filter === 'Active' && !isDone(req.status)) ||
      (filter === 'Done'   &&  isDone(req.status));
    return matchSearch && matchFilter;
  });

  return (
    <div className="bg-white w-full flex-1 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
      <p className="text-2xl font-semibold text-primary">Request Management</p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 w-full">
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

        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Single Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-t">
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
            ) : filtered.map(req => {
              const cfg = statusConfig[req.status];
              return (
                <tr key={req.id} className="border-b last:border-none hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-primary font-medium">{req.name}</td>
                  <td className="py-3 px-4 text-primary">{req.documentType}</td>
                  <td className="py-3 px-4 text-primary">{req.submissionDate}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', cfg.className)}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 w-px whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {req.status === 'PENDING' && (
                        <>
                          <Button variant="danger"  label="Reject"          onClick={() => {}} />
                          <Button variant="info"    onClick={() => router.push(`/staff/request/${req.id}`)} />
                          <Button variant="primary" label="Send to Advisor" onClick={() => {}} />
                        </>
                      )}
                      {req.status === 'FORWARDED_TO_ADVISOR' && (
                        <>
                          <Button variant="danger" label="Reject" onClick={() => {}} />
                          <Button variant="info"   onClick={() => router.push(`/staff/request/${req.id}`)} />
                        </>
                      )}
                      {req.status === 'ADVISOR_APPROVED' && (
                        <>
                          <Button variant="danger"  label="Reject"  onClick={() => {}} />
                          <Button variant="info"    onClick={() => router.push(`/staff/request/${req.id}`)} />
                          <Button variant="success" label="Approve" onClick={() => {}} />
                        </>
                      )}
                      {req.status === 'ADVISOR_REJECTED' && (
                        <Button variant="info" onClick={() => router.push(`/staff/request/${req.id}`)} />
                      )}
                      {req.status === 'STAFF_APPROVED' && (
                        <>
                          <Button variant="info"    onClick={() => router.push(`/staff/request/${req.id}`)} />
                          <Button variant="primary" label="Forward to Dean" onClick={() => {}} />
                        </>
                      )}
                      {(req.status === 'FORWARDED_TO_DEAN' || isDone(req.status)) && (
                        <Button variant="info" onClick={() => router.push(`/staff/request/${req.id}`)} />
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
