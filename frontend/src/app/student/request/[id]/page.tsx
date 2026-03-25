'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  RiArrowLeftLine, RiCheckLine, RiTimeLine, RiCloseCircleLine,
  RiFileTextLine, RiCalendarLine, RiInformationLine, RiEyeLine,
  RiCloseLine, RiPrinterLine,
} from 'react-icons/ri';

/* ─── Types ──────────────────────────────────────────────────── */
type RequestStatus =
  | 'PENDING'
  | 'FORWARDED_TO_ADVISOR'
  | 'ADVISOR_APPROVED'
  | 'ADVISOR_REJECTED'
  | 'STAFF_APPROVED'
  | 'STAFF_REJECTED'
  | 'FORWARDED_TO_DEAN'
  | 'DEAN_APPROVED'
  | 'DEAN_REJECTED'
  | 'CANCELLED';

interface RequestDetail {
  id: number;
  title: string;
  requestType: string;
  submittedDate: string;
  updatedDate: string;
  status: RequestStatus;
  staffComment: string | null;
  description: string | null;
}

/* ─── Mock Data ──────────────────────────────────────────────── */
const mockRequests: Record<string, RequestDetail> = {
  '1': {
    id: 1,
    title: 'Leave Request Form',
    requestType: 'Leave Request Form',
    submittedDate: '25/03/2026',
    updatedDate: '25/03/2026',
    status: 'PENDING',
    staffComment: null,
    description: null,
  },
  '2': {
    id: 2,
    title: 'Enrollment Certificate',
    requestType: 'Enrollment Certificate',
    submittedDate: '10/03/2026',
    updatedDate: '12/03/2026',
    status: 'ADVISOR_APPROVED',
    staffComment: null,
    description: null,
  },
  '3': {
    id: 3,
    title: 'Conference Letter',
    requestType: 'Conference Letter',
    submittedDate: '01/03/2026',
    updatedDate: '05/03/2026',
    status: 'STAFF_REJECTED',
    staffComment: 'Missing conference acceptance letter. Please resubmit with the required document.',
    description: null,
  },
  '4': {
    id: 4,
    title: 'Leave Request Form',
    requestType: 'Leave Request Form',
    submittedDate: '15/02/2026',
    updatedDate: '20/02/2026',
    status: 'DEAN_APPROVED',
    staffComment: 'Approved. Document ready for pickup at the IR office.',
    description: null,
  },
};

/* ─── Status config ──────────────────────────────────────────── */
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:              { label: 'Pending Review',      color: 'text-yellow-700', bg: 'bg-yellow-100', icon: <RiTimeLine size={14} /> },
  FORWARDED_TO_ADVISOR: { label: 'At Advisor',          color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <RiTimeLine size={14} /> },
  ADVISOR_APPROVED:     { label: 'Advisor Approved',    color: 'text-teal-700',   bg: 'bg-teal-100',   icon: <RiCheckLine size={14} /> },
  ADVISOR_REJECTED:     { label: 'Advisor Rejected',    color: 'text-orange-700', bg: 'bg-orange-100', icon: <RiCloseCircleLine size={14} /> },
  STAFF_APPROVED:       { label: 'Staff Approved',      color: 'text-indigo-700', bg: 'bg-indigo-100', icon: <RiCheckLine size={14} /> },
  STAFF_REJECTED:       { label: 'Rejected',            color: 'text-red-600',    bg: 'bg-red-100',    icon: <RiCloseCircleLine size={14} /> },
  FORWARDED_TO_DEAN:    { label: 'At Dean',             color: 'text-purple-700', bg: 'bg-purple-100', icon: <RiTimeLine size={14} /> },
  DEAN_APPROVED:        { label: 'Completed',           color: 'text-green-700',  bg: 'bg-green-100',  icon: <RiCheckLine size={14} /> },
  DEAN_REJECTED:        { label: 'Rejected by Dean',    color: 'text-red-600',    bg: 'bg-red-100',    icon: <RiCloseCircleLine size={14} /> },
  CANCELLED:            { label: 'Cancelled',           color: 'text-gray-500',   bg: 'bg-gray-100',   icon: <RiCloseCircleLine size={14} /> },
};

/* ─── Timeline Steps ─────────────────────────────────────────── */
type StepState = 'done' | 'active' | 'rejected' | 'idle';

interface TimelineStep {
  label: string;
  sub?: string;
  state: StepState;
}

function buildTimeline(status: RequestStatus): TimelineStep[] {
  const order: RequestStatus[] = [
    'PENDING',
    'FORWARDED_TO_ADVISOR',
    'ADVISOR_APPROVED',
    'STAFF_APPROVED',
    'FORWARDED_TO_DEAN',
    'DEAN_APPROVED',
  ];

  const labels: Record<string, string> = {
    PENDING:              'Submitted',
    FORWARDED_TO_ADVISOR: 'Forwarded to Advisor',
    ADVISOR_APPROVED:     'Advisor Reviewed',
    STAFF_APPROVED:       'Staff Approved',
    FORWARDED_TO_DEAN:    'Forwarded to Dean',
    DEAN_APPROVED:        'Completed',
  };

  const rejectedAt: Partial<Record<RequestStatus, string>> = {
    ADVISOR_REJECTED: 'FORWARDED_TO_ADVISOR',
    STAFF_REJECTED:   'ADVISOR_APPROVED',
    DEAN_REJECTED:    'FORWARDED_TO_DEAN',
    CANCELLED:        'PENDING',
  };

  const isRejected = status in rejectedAt;
  const rejectedAfter = rejectedAt[status];
  const currentIndex = isRejected
    ? order.indexOf(rejectedAfter as RequestStatus)
    : order.indexOf(status);

  return order.map((s, i) => {
    let state: StepState = 'idle';
    if (isRejected) {
      if (i < currentIndex) state = 'done';
      else if (i === currentIndex) state = 'rejected';
      else state = 'idle';
    } else {
      if (i < currentIndex) state = 'done';
      else if (i === currentIndex) state = 'active';
      else state = 'idle';
    }
    return { label: labels[s], state };
  });
}

/* ─── Step indicator dot ─────────────────────────────────────── */
function StepDot({ state }: { state: StepState }) {
  if (state === 'done') return (
    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0 z-10">
      <RiCheckLine size={14} className="text-white" />
    </div>
  );
  if (state === 'active') return (
    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 z-10 ring-4 ring-primary/20">
      <div className="w-2.5 h-2.5 rounded-full bg-white" />
    </div>
  );
  if (state === 'rejected') return (
    <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0 z-10">
      <RiCloseCircleLine size={14} className="text-white" />
    </div>
  );
  return (
    <div className="w-7 h-7 rounded-full border-2 border-gray-200 bg-white shrink-0 z-10" />
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function StudentRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);

  const req = mockRequests[id] ?? mockRequests['1'];
  const statusCfg = STATUS_CONFIG[req.status];
  const timeline = buildTimeline(req.status);

  const isRejected = ['STAFF_REJECTED', 'ADVISOR_REJECTED', 'DEAN_REJECTED', 'CANCELLED'].includes(req.status);
  const isCompleted = req.status === 'DEAN_APPROVED';

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className={clsx(
          'px-6 py-5 flex items-center gap-4',
          isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-400'
            : isRejected ? 'bg-gradient-to-r from-red-500 to-rose-400'
            : 'bg-gradient-to-r from-primary to-blue-400'
        )}>
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition shrink-0"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{req.title}</h1>
            <p className="text-xs text-white/70 mt-0.5">Request #{String(req.id).padStart(4, '0')}</p>
          </div>
          <span className={clsx(
            'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 text-white'
          )}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>

        {/* Info bar */}
        <div className="px-6 py-3 flex items-center gap-6 text-xs text-gray-500 border-t border-gray-100 bg-gray-50/50 flex-wrap">
          <span className="flex items-center gap-1.5">
            <RiCalendarLine size={13} className="text-primary" />
            Submitted: <strong className="text-gray-700 ml-1">{req.submittedDate}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <RiTimeLine size={13} className="text-primary" />
            Last update: <strong className="text-gray-700 ml-1">{req.updatedDate}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <RiFileTextLine size={13} className="text-primary" />
            Type: <strong className="text-gray-700 ml-1">{req.requestType}</strong>
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">

        {/* LEFT: Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:w-64 shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">Progress</p>
          <div className="flex flex-col gap-0">
            {timeline.map((step, i) => (
              <div key={i} className="flex gap-3">
                {/* Dot + line */}
                <div className="flex flex-col items-center">
                  <StepDot state={step.state} />
                  {i < timeline.length - 1 && (
                    <div className={clsx(
                      'w-0.5 flex-1 min-h-[28px] mt-0.5',
                      step.state === 'done' ? 'bg-green-300' : 'bg-gray-200'
                    )} />
                  )}
                </div>
                {/* Label */}
                <div className="pb-6 pt-0.5 min-w-0">
                  <p className={clsx(
                    'text-sm font-medium leading-tight',
                    step.state === 'done'     ? 'text-green-700' :
                    step.state === 'active'   ? 'text-primary font-semibold' :
                    step.state === 'rejected' ? 'text-red-600' :
                    'text-gray-400'
                  )}>
                    {step.label}
                  </p>
                  {step.state === 'active' && (
                    <p className="text-[10px] text-primary/60 mt-0.5">In progress…</p>
                  )}
                  {step.state === 'rejected' && (
                    <p className="text-[10px] text-red-500 mt-0.5">Rejected here</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Details */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Rejection / Completion banner */}
          {isRejected && req.staffComment && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex gap-3">
              <RiCloseCircleLine size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Request Rejected</p>
                <p className="text-sm text-red-600 mt-1">{req.staffComment}</p>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex gap-3">
              <RiCheckLine size={18} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-700">Request Completed</p>
                {req.staffComment
                  ? <p className="text-sm text-green-600 mt-1">{req.staffComment}</p>
                  : <p className="text-sm text-green-600 mt-1">Your request has been fully approved.</p>
                }
              </div>
            </div>
          )}

          {/* Status card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Current Status</p>
            <div className={clsx('inline-flex items-center gap-2 px-4 py-2.5 rounded-xl w-fit', statusCfg.bg)}>
              <span className={statusCfg.color}>{statusCfg.icon}</span>
              <span className={clsx('text-sm font-semibold', statusCfg.color)}>{statusCfg.label}</span>
            </div>

            {!isRejected && !isCompleted && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <RiInformationLine size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-primary">
                  {req.status === 'PENDING' && 'Your request is waiting for staff review. You will be notified when the status changes.'}
                  {req.status === 'FORWARDED_TO_ADVISOR' && 'Your request has been forwarded to your advisor for review.'}
                  {req.status === 'ADVISOR_APPROVED' && 'Your advisor has approved. The request is now with staff for final review.'}
                  {req.status === 'STAFF_APPROVED' && 'Staff has approved. The request will be forwarded to the Dean.'}
                  {req.status === 'FORWARDED_TO_DEAN' && 'Your request is pending Dean approval.'}
                </p>
              </div>
            )}

            {/* Staff comment (non-rejection) */}
            {!isRejected && !isCompleted && req.staffComment && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Staff Comment</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{req.staffComment}</p>
              </div>
            )}
          </div>

          {/* View document button */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Document</p>
            <p className="text-sm text-gray-500">
              {isCompleted
                ? 'Your document is ready. You can preview or print it below.'
                : 'Document preview is available once the request is completed.'}
            </p>
            <button
              onClick={() => setShowPreview(true)}
              disabled={!isCompleted}
              className={clsx(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition w-fit',
                isCompleted
                  ? 'bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              <RiEyeLine size={15} /> View Document
            </button>
          </div>

        </div>
      </div>

      {/* Document Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <RiFileTextLine size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{req.title}</p>
                  <p className="text-xs text-gray-400">Approved document · Read-only</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
              >
                <RiCloseLine size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
              <div className="bg-white shadow-lg rounded-lg p-10 min-h-[400px] flex items-center justify-center">
                <p className="text-gray-400 text-sm">Document content will appear here when connected to API.</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
              >
                <RiPrinterLine size={14} /> Print
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-5 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
