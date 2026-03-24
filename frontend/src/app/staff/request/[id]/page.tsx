'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiUser3Line, RiFileTextLine, RiCalendarLine, RiUserStarLine, RiCloseLine, RiDownloadLine, RiPrinterLine, RiEyeLine, RiCheckLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';

type RequestStatus = 'PENDING' | 'FORWARDED_TO_ADVISOR' | 'ADVISOR_APPROVED' | 'ADVISOR_REJECTED' | 'STAFF_APPROVED' | 'STAFF_REJECTED' | 'FORWARDED_TO_DEAN' | 'DEAN_APPROVED' | 'DEAN_REJECTED';

interface LogEntry {
  date: string;
  detail: string;
  stepStatus: 'pending' | 'finished';
  action: 'approve' | 'view' | 'forward_dean';
}

interface RequestDetail {
  reqId: string;
  name: string;
  documentType: string;
  startRequest: string;
  advisor: string;
  status: RequestStatus;
  logs: LogEntry[];
}

const mockDetails: Record<string, RequestDetail> = {
  '1': {
    reqId: 'Req001', name: 'Joanna Sofia', documentType: 'Leave Request Form',
    startRequest: '01/01/1001', advisor: 'Asst. Prof. Pusadee Seresangtakul',
    status: 'ADVISOR_APPROVED',
    logs: [
      { date: '01/01/1001', detail: 'Staff of College Approved', stepStatus: 'pending',  action: 'approve' },
      { date: '01/01/1001', detail: 'Advisor Approved',          stepStatus: 'finished', action: 'view' },
      { date: '01/01/1001', detail: 'Pending',                   stepStatus: 'finished', action: 'view' },
      { date: '01/01/1001', detail: 'Create New Request',        stepStatus: 'finished', action: 'view' },
    ],
  },
  '4': {
    reqId: 'Req004', name: 'Monica Sofia', documentType: 'Leave Request Form',
    startRequest: '01/01/1001', advisor: 'Asst. Prof. Pusadee Seresangtakul',
    status: 'STAFF_APPROVED',
    logs: [
      { date: '01/01/1001', detail: 'Forward to Dean',           stepStatus: 'pending',  action: 'forward_dean' },
      { date: '01/01/1001', detail: 'Staff of College Approved', stepStatus: 'finished', action: 'view' },
      { date: '01/01/1001', detail: 'Advisor Approved',          stepStatus: 'finished', action: 'view' },
      { date: '01/01/1001', detail: 'Pending',                   stepStatus: 'finished', action: 'view' },
      { date: '01/01/1001', detail: 'Create New Request',        stepStatus: 'finished', action: 'view' },
    ],
  },
};

const statusLabelConfig: Record<RequestStatus, { label: string; className: string }> = {
  PENDING:              { label: 'Pending',               className: 'bg-yellow-100 text-yellow-700' },
  FORWARDED_TO_ADVISOR: { label: 'Forwarded to Advisor',  className: 'bg-blue-100 text-blue-700' },
  ADVISOR_APPROVED:     { label: 'Advisor Approved',      className: 'bg-teal-100 text-teal-700' },
  ADVISOR_REJECTED:     { label: 'Advisor Rejected',      className: 'bg-orange-100 text-orange-700' },
  STAFF_APPROVED:       { label: 'Staff Approved',        className: 'bg-indigo-100 text-indigo-700' },
  STAFF_REJECTED:       { label: 'Cancelled',             className: 'bg-red-100 text-red-600' },
  FORWARDED_TO_DEAN:    { label: 'Forwarded to Dean',     className: 'bg-purple-100 text-purple-700' },
  DEAN_APPROVED:        { label: 'Completed',             className: 'bg-green-100 text-green-700' },
  DEAN_REJECTED:        { label: 'Dean Rejected',         className: 'bg-red-100 text-red-600' },
};

export default function StaffRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const req = mockDetails[id] ?? mockDetails['1'];
  const statusCfg = statusLabelConfig[req.status];

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200 shrink-0"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-primary">{req.reqId}</h1>
        <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', statusCfg.className)}>
          {statusCfg.label}
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {/* LEFT: Info Card */}
        <div className="lg:w-72 shrink-0 flex flex-col gap-4">
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Request Info</p>
            {[
              { icon: RiUser3Line,    label: 'Name',          value: req.name },
              { icon: RiFileTextLine, label: 'Document Type', value: req.documentType },
              { icon: RiCalendarLine, label: 'Start Request', value: req.startRequest },
              { icon: RiUserStarLine, label: 'Advisor',       value: req.advisor },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-primary/50">
                  <Icon size={13} />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <span className="text-sm font-semibold text-primary leading-snug pl-5">{value}</span>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-primary/50">
                <RiFileTextLine size={13} />
                <span className="text-xs font-medium">Status</span>
              </div>
              <span className={clsx('inline-block px-3 py-1 rounded-full text-xs font-medium w-fit ml-5', statusCfg.className)}>
                {statusCfg.label}
              </span>
            </div>
          </div>

          {/* View Document Button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary hover:text-white transition-all duration-200"
          >
            <RiEyeLine size={16} />
            View Document
          </button>
        </div>

        {/* RIGHT: Activity History */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <p className="text-sm font-semibold text-primary/50 uppercase tracking-wide">Activity History</p>
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left   py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Last Update</th>
                  <th className="text-left   py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Detail Update</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {req.logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{log.date}</td>
                    <td className="py-3 px-4 text-primary font-medium">{log.detail}</td>
                    <td className="py-3 px-4 text-center">
                      {log.stepStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block animate-pulse" />
                          pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                          <RiCheckLine size={12} />
                          finished
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {log.action === 'approve' ? (
                        <Button variant="success" label="Approve" onClick={() => {}} />
                      ) : log.action === 'forward_dean' ? (
                        <Button variant="primary" label="Forward to Dean" onClick={() => {}} />
                      ) : (
                        <Button variant="info" onClick={() => {}} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="font-semibold text-primary">Document Preview</p>
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200"
              >
                <RiCloseLine size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="w-full h-80 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                Document Preview Area
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Button variant="ghost" label="Close" onClick={() => setShowModal(false)} />
              <Button variant="ghost" label="Download" icon={RiDownloadLine} onClick={() => {}} />
              <Button variant="primary" label="Print" icon={RiPrinterLine} onClick={() => {}} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
