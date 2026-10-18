'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isImageUrl, isPdfUrl, fileExtension, fileApi, requestApi, deanApi, generatedDocApi, templateVariableApi, latestCancelRequest, latestCancelRejection, reviewerComments, type ApiRequest, type ApiRequestEvent, type ApiDocSignature, type ApiGeneratedDoc } from '@/lib/api';
import SignatureModal from '@/components/SignatureModal';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  RiArrowLeftLine, RiCheckLine, RiTimeLine, RiCloseCircleLine,
  RiFileTextLine, RiEyeLine, RiCloseLine, RiPrinterLine, RiDownloadLine, RiPenNibLine,
  RiEditLine, RiForbidLine, RiMailLine, RiFile3Line, RiArrowUpSLine, RiArrowDownSLine,
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
  | 'CANCELLED'
  | 'CANCEL_REQUESTED';

interface RequestDetail {
  id: number;
  title: string;
  requestType: string;
  submittedDate: string;
  updatedDate: string;
  status: RequestStatus;
  // Comment left with the decision that set the current status (rejection reason, dean's note)
  decisionComment: string | null;
  description: string | null;
}

// Comment on the latest event that moved the request into its current status
function decisionCommentOf(r: ApiRequest): string | null {
  const events = r.events ?? [];
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].toStatus === r.status) return events[i].comment;
  }
  return null;
}

/* ─── Formatting ─────────────────────────────────────────────── */
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB');
const fmtDateTime = (iso: string) =>
  `${fmtDate(iso)} · ${new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

// "Thitikorn Suwanbutwipha" → "Thitikorn S."
function shortName(name?: string | null) {
  if (!name) return '';
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

function initials(name?: string | null) {
  const words = (name ?? '').replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?';
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Student', STAFF: 'Staff', ADVISOR: 'Advisor', DEAN: 'Dean', VICE_DEAN: 'Acting Dean',
};

/* ─── Status pill ────────────────────────────────────────────── */
const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:              { label: 'Waiting for staff',      className: 'bg-amber-100 text-amber-800',   icon: <RiTimeLine size={15} /> },
  STAFF_APPROVED:       { label: 'Approved by staff',      className: 'bg-secondary text-primary',     icon: <RiCheckLine size={15} /> },
  FORWARDED_TO_ADVISOR: { label: 'Waiting for advisor',    className: 'bg-amber-100 text-amber-800',   icon: <RiTimeLine size={15} /> },
  ADVISOR_APPROVED:     { label: 'Approved by advisor',    className: 'bg-secondary text-primary',     icon: <RiCheckLine size={15} /> },
  FORWARDED_TO_DEAN:    { label: 'Waiting for dean',       className: 'bg-amber-100 text-amber-800',   icon: <RiTimeLine size={15} /> },
  DEAN_APPROVED:        { label: 'Completed',              className: 'bg-green-100 text-green-700',   icon: <RiCheckLine size={15} /> },
  STAFF_REJECTED:       { label: 'Rejected by staff',      className: 'bg-red-100 text-red-600',       icon: <RiCloseCircleLine size={15} /> },
  ADVISOR_REJECTED:     { label: 'Rejected by advisor',    className: 'bg-red-100 text-red-600',       icon: <RiCloseCircleLine size={15} /> },
  DEAN_REJECTED:        { label: 'Rejected by dean',       className: 'bg-red-100 text-red-600',       icon: <RiCloseCircleLine size={15} /> },
  CANCELLED:            { label: 'Cancelled',              className: 'bg-gray-100 text-gray-500',     icon: <RiCloseCircleLine size={15} /> },
  CANCEL_REQUESTED:     { label: 'Cancellation requested', className: 'bg-amber-100 text-amber-800',   icon: <RiTimeLine size={15} /> },
};

/* ─── Timeline ───────────────────────────────────────────────── */
type StepState = 'done' | 'active' | 'rejected' | 'idle';

interface TimelineStep {
  label: string;
  state: StepState;
  sub?: string;
}

const STEPS: { status: RequestStatus; label: string }[] = [
  { status: 'PENDING',              label: 'Submitted' },
  { status: 'STAFF_APPROVED',       label: 'Staff approved' },
  { status: 'FORWARDED_TO_ADVISOR', label: 'Forwarded to advisor' },
  { status: 'ADVISOR_APPROVED',     label: 'Advisor reviewed' },
  { status: 'FORWARDED_TO_DEAN',    label: 'Forwarded to dean' },
  { status: 'DEAN_APPROVED',        label: 'Completed' },
];

// Which step a rejection happened at
const REJECTED_AT: Partial<Record<RequestStatus, number>> = {
  STAFF_REJECTED: 1, ADVISOR_REJECTED: 3, DEAN_REJECTED: 5,
};

function latestEventTo(events: ApiRequestEvent[], status: string) {
  for (let i = events.length - 1; i >= 0; i--) if (events[i].toStatus === status) return events[i];
  return null;
}

function eventSub(e: ApiRequestEvent | null, prefix = '') {
  if (!e) return prefix || undefined;
  const who = e.actorRole === 'STUDENT' ? 'by you' : shortName(e.actor?.name);
  return [prefix, fmtDate(e.createdAt), who].filter(Boolean).join(' · ');
}

/**
 * Builds the progress list from the request history.
 * `workflowStatus` is where the request sits in the workflow — for a pending
 * cancellation that is the status it had before the student asked.
 */
function buildTimeline(status: RequestStatus, workflowStatus: RequestStatus, events: ApiRequestEvent[]): TimelineStep[] {
  const lastEvent = events[events.length - 1] ?? null;
  const submitted = events.find(e => e.type === 'SUBMITTED') ?? null;
  const subFor = (i: number) => i === 0 ? eventSub(submitted) : eventSub(latestEventTo(events, STEPS[i].status));

  if (workflowStatus === 'DEAN_APPROVED') {
    return STEPS.map((s, i) => ({ label: s.label, state: 'done', sub: subFor(i) }));
  }

  const rejectedAt = REJECTED_AT[workflowStatus];
  if (rejectedAt !== undefined) {
    return STEPS.map((s, i) => ({
      label: i === rejectedAt ? `Rejected by ${ROLE_LABEL[lastEvent?.actorRole ?? '']?.toLowerCase() ?? 'reviewer'}` : s.label,
      state: i < rejectedAt ? 'done' : i === rejectedAt ? 'rejected' : 'idle',
      sub: i < rejectedAt ? subFor(i) : i === rejectedAt ? eventSub(latestEventTo(events, workflowStatus)) : undefined,
    }));
  }

  // Cancelled: everything reached before the cancellation stays done, the next step shows the cancellation
  if (workflowStatus === 'CANCELLED') {
    const before = (latestEventTo(events, 'CANCEL_REQUESTED')?.fromStatus ?? 'PENDING') as RequestStatus;
    const reached = Math.max(0, STEPS.findIndex(s => s.status === before));
    return STEPS.map((s, i) => ({
      label: i === reached + 1 ? 'Cancelled' : s.label,
      state: i <= reached ? 'done' : i === reached + 1 ? 'rejected' : 'idle',
      sub: i <= reached ? subFor(i) : i === reached + 1 ? eventSub(latestEventTo(events, 'CANCELLED')) : undefined,
    }));
  }

  // In progress: a "forwarded" step is itself the one being worked on; otherwise it's the next one
  const reached = Math.max(0, STEPS.findIndex(s => s.status === workflowStatus));
  const activeIndex = workflowStatus.startsWith('FORWARDED_') ? reached : reached + 1;
  const since = lastEvent ? fmtDate(lastEvent.createdAt) : '';
  const activeSub = status === 'CANCEL_REQUESTED'
    ? 'On hold · cancellation requested'
    : `In progress${since ? ` · since ${since}` : ''}`;

  return STEPS.map((s, i) => ({
    label: s.label,
    state: i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'idle',
    sub: i < activeIndex ? subFor(i) : i === activeIndex ? activeSub : undefined,
  }));
}

function StepDot({ state }: { state: StepState }) {
  if (state === 'done') return (
    <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0 z-10">
      <RiCheckLine size={15} className="text-white" />
    </div>
  );
  if (state === 'active') return (
    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 z-10 ring-4 ring-primary/20">
      <div className="w-2.5 h-2.5 rounded-full bg-white" />
    </div>
  );
  if (state === 'rejected') return (
    <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0 z-10">
      <RiCloseLine size={15} className="text-white" />
    </div>
  );
  return <div className="w-7 h-7 rounded-full border-2 border-gray-300 bg-white shrink-0 z-10" />;
}

/* ─── Small building blocks ──────────────────────────────────── */
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6', className)}>{children}</div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">{children}</p>;
}

function Avatar({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' }) {
  return (
    <div className={clsx(
      'rounded-full bg-secondary text-primary font-bold flex items-center justify-center shrink-0',
      size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm',
    )}>
      {initials(name)}
    </div>
  );
}

const SIG_ROLE_LABEL: Record<string, string> = { student: 'You', ir_staff: 'Staff', advisor: 'Advisor', dean: 'Dean' };

// Whose signature the workflow is currently waiting for
function sigTurn(role: string, workflowStatus: RequestStatus) {
  if (role === 'ir_staff') return workflowStatus === 'PENDING';
  if (role === 'advisor')  return workflowStatus === 'FORWARDED_TO_ADVISOR';
  if (role === 'dean')     return workflowStatus === 'FORWARDED_TO_DEAN';
  return false;
}

const humanize = (key: string) => key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
const fileNameOf = (url: string) => {
  try { return decodeURIComponent(url.split('?')[0].split('/').pop() ?? url); } catch { return url; }
};

/* ─── Page ───────────────────────────────────────────────────── */
export default function StudentRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [reqData, setReqData] = useState<RequestDetail | null>(null);
  const [fullReq, setFullReq] = useState<ApiRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deanName, setDeanName] = useState('');
  const [genDoc, setGenDoc] = useState<ApiGeneratedDoc | null>(null);
  const [signatures, setSignatures] = useState<ApiDocSignature[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  // Variable key → label, so request details read like the form the student filled in
  const [templateLabels, setTemplateLabels] = useState<Record<string, string>>({});
  const previewContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    deanApi.getSignatory().then(r => setDeanName(r.data.data.name)).catch(() => {});
    templateVariableApi.getAll()
      .then(r => setTemplateLabels(Object.fromEntries(r.data.data.map(v => [v.key, v.label]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    requestApi.getById(Number(id))
      .then(res => {
        const r = res.data.data;
        setFullReq(r);
        setReqData({
          id: r.id,
          title: r.title,
          requestType: r.requestType?.name ?? r.title,
          submittedDate: new Date(r.createdAt).toLocaleDateString('en-GB'),
          updatedDate: new Date(r.updatedAt).toLocaleDateString('en-GB'),
          status: r.status as RequestStatus,
          decisionComment: decisionCommentOf(r),
          description: r.description ?? null,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    loadGeneratedDoc(Number(id));
  }, [id]);

  async function handleRequestCancel() {
    if (!fullReq || !cancelReason.trim()) return;
    setCancelSubmitting(true);
    try {
      const res = await requestApi.requestCancel(fullReq.id, cancelReason.trim());
      const updated = res.data.data;
      // Keep the loaded document templates; take the new status and history
      setFullReq({ ...fullReq, status: updated.status, events: updated.events });
      setReqData(prev => prev ? { ...prev, status: updated.status as RequestStatus } : prev);
      setShowCancelModal(false);
      setCancelReason('');
      toast.success('Cancellation request sent to staff');
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Failed to send cancellation request');
    } finally {
      setCancelSubmitting(false);
    }
  }

  // Re-read the generated document + its signatures — also after Approve, since
  // "approval"-signed templates get the approver's name printed in server-side.
  function loadGeneratedDoc(requestId: number) {
    generatedDocApi.getByRequest(requestId)
      .then(res => {
        const doc = res.data.data[0] ?? null;
        setGenDoc(doc);
        if (doc) {
          generatedDocApi.getSignatures(doc.id).then(r => setSignatures(r.data.data)).catch(() => {});
        }
      })
      .catch(() => {});
  }

  const isApprovalSigning = fullReq?.requestType?.documentTemplates?.[0]?.signingMethod === 'approval';

  function handleSigned(updated: ApiDocSignature[]) {
    setSignatures(updated);
    if (genDoc) generatedDocApi.getById(genDoc.id).then(r => setGenDoc(r.data.data)).catch(() => {});
  }

  const requiredSigRoles: string[] = (() => {
    try {
      const vars: string[] = JSON.parse(fullReq?.requestType?.documentTemplates?.[0]?.variables ?? '[]');
      return vars.filter((v: string) => v.startsWith('{{sig_')).map((v: string) => v.slice(6, -2));
    } catch { return []; }
  })();

  if (loading) {
    return (
      <div className="flex flex-col gap-5 w-full animate-pulse">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-28" />
        <div className="flex gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-64 lg:w-64 shrink-0" />
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm h-64" />
        </div>
      </div>
    );
  }

  if (notFound || !reqData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 py-24 w-full">
        <RiCloseCircleLine size={36} className="text-gray-300" />
        <p className="text-gray-500 font-medium">Request not found</p>
        <p className="text-sm text-gray-400 -mt-2">It may have been removed, or you don&apos;t have access to view it.</p>
        <button
          onClick={() => router.push('/student/request')}
          className="mt-2 bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition"
        >
          Back to My Requests
        </button>
      </div>
    );
  }

  const req = reqData;
  const events = fullReq?.events ?? [];
  const statusCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
  // While a cancellation is pending, the workflow stays where the request was
  const cancelEvent = fullReq ? latestCancelRequest(fullReq) : null;
  const workflowStatus = req.status === 'CANCEL_REQUESTED'
    ? (cancelEvent?.fromStatus as RequestStatus | undefined) ?? 'PENDING'
    : req.status;
  const timeline = buildTimeline(req.status, workflowStatus, events);

  const isRejected = ['STAFF_REJECTED', 'ADVISOR_REJECTED', 'DEAN_REJECTED'].includes(req.status);
  const isCancelled = req.status === 'CANCELLED';
  const isCompleted = req.status === 'DEAN_APPROVED';
  const isClosed = isRejected || isCancelled || isCompleted;

  const cancelPending = req.status === 'CANCEL_REQUESTED';
  const cancelRejection = fullReq && !cancelPending && !isClosed ? latestCancelRejection(fullReq) : null;
  const canEdit = req.status === 'PENDING';
  const canRequestCancel = !isClosed && !cancelPending;

  const iSigned = signatures.some(s => s.role === 'student');
  const needsMySignature = !!genDoc && !isApprovalSigning && !iSigned && !isClosed;
  const comments = fullReq ? reviewerComments(fullReq) : [];
  const lastUpdate = events[events.length - 1];

  const advisor = fullReq?.student?.advisor;
  const advisorName = advisor ? [advisor.titleEn, advisor.firstNameEn, advisor.lastNameEn].filter(Boolean).join(' ') : '';
  const advisorEmail = advisor?.user?.email ?? '';

  const attachmentUrls: string[] = (() => { try { return JSON.parse(fullReq?.attachments ?? '[]'); } catch { return []; } })();
  const formEntries = (() => {
    const data: Record<string, string> = (() => { try { return JSON.parse(fullReq?.formData ?? '{}'); } catch { return {}; } })();
    return Object.entries(data).filter(([k, v]) => !k.startsWith('sig_') && v && String(v).trim() && v !== '—');
  })();

  // What the student should know right now, by where the request is
  const next: { eyebrow: string; title: string; chip: string; chipClass: string; note?: string | null } = (() => {
    if (cancelPending) return {
      eyebrow: 'What happens next', title: 'Staff are reviewing your cancellation',
      chip: 'Request on hold', chipClass: 'bg-amber-50 text-amber-800',
      note: cancelEvent?.comment ? `Your reason: ${cancelEvent.comment}` : null,
    };
    if (isCancelled) return {
      eyebrow: 'Status', title: 'This request was cancelled',
      chip: 'Closed', chipClass: 'bg-gray-100 text-gray-600', note: req.decisionComment,
    };
    if (isRejected) return {
      eyebrow: 'Status', title: 'Your request was not approved',
      chip: 'Closed', chipClass: 'bg-red-50 text-red-600',
      note: req.decisionComment ? `Reason: ${req.decisionComment}` : 'No reason was given.',
    };
    if (isCompleted) return {
      eyebrow: 'Status', title: 'Your request is complete',
      chip: 'Your document is ready', chipClass: 'bg-green-50 text-green-700', note: req.decisionComment,
    };
    const action = needsMySignature
      ? { chip: 'Action needed: sign your document', chipClass: 'bg-amber-50 text-amber-800' }
      : { chip: 'No action needed from you right now', chipClass: 'bg-green-50 text-green-700' };
    const titles: Partial<Record<RequestStatus, string>> = {
      PENDING:              'Your request is with the staff',
      STAFF_APPROVED:       'Staff approved — forwarding to your advisor',
      FORWARDED_TO_ADVISOR: 'Your request is with your advisor',
      ADVISOR_APPROVED:     'Your advisor approved — forwarding to the dean',
      FORWARDED_TO_DEAN:    'Your request is with the dean',
    };
    return { eyebrow: 'What happens next', title: titles[req.status] ?? 'In progress', ...action };
  })();

  // Who currently holds the request
  const holder: { role: string; name: string; email?: string } | null =
    cancelPending || isClosed ? null
    : workflowStatus === 'FORWARDED_TO_ADVISOR' ? (advisorName ? { role: 'Your advisor', name: advisorName, email: advisorEmail } : null)
    : workflowStatus === 'FORWARDED_TO_DEAN' ? (deanName ? { role: 'Dean', name: deanName } : null)
    : { role: 'Handled by', name: 'International Relations staff' };

  async function downloadDocument() {
    if (!genDoc) { setShowPreview(true); return; } // no PDF yet — the preview can build one
    try {
      const blob = (await generatedDocApi.download(genDoc.id)).data;
      const a = document.createElement('a');
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = `${req.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      toast.error('Failed to download document');
    }
  }

  return (
    // pb-6: the page is taller than the layout's scroll area, so the layout's own
    // bottom padding ends up mid-page — keep a gap above the footer here
    <div className="flex flex-col gap-5 w-full pb-6">

      {/* Header */}
      <Card className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#F3F7FD] text-gray-700 hover:bg-primary hover:text-white transition shrink-0"
            aria-label="Back"
          >
            <RiArrowLeftLine size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{req.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-4">
              <span>Request <strong className="text-gray-800">#{String(req.id).padStart(4, '0')}</strong></span>
              <span>Submitted <strong className="text-gray-800">{req.submittedDate}</strong></span>
              <span>Last updated <strong className="text-gray-800">{lastUpdate ? fmtDate(lastUpdate.createdAt) : req.updatedDate}</strong></span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className={clsx('inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold', statusCfg.className)}>
            {statusCfg.icon} {statusCfg.label}
          </span>
          {(canEdit || canRequestCancel) && <span className="hidden sm:block w-px h-8 bg-gray-200" />}
          {canEdit && fullReq?.requestTypeId && (
            <button
              onClick={() => router.push(`/student/request/new/${fullReq.requestTypeId}?edit=${req.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-primary/40 text-primary hover:bg-primary/5 transition"
            >
              <RiEditLine size={15} /> Edit
            </button>
          )}
          {canRequestCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition"
            >
              <RiForbidLine size={15} /> Request cancellation
            </button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">

        {/* LEFT: progress + attachments */}
        <div className="flex flex-col gap-5">
          <Card>
            <Eyebrow>Progress</Eyebrow>
            <div className="flex flex-col mt-5">
              {timeline.map((step, i) => (
                <div key={step.label + i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <StepDot state={step.state} />
                    {i < timeline.length - 1 && (
                      <div className={clsx('w-0.5 flex-1 min-h-[22px]', step.state === 'done' ? 'bg-green-600' : 'bg-gray-200')} />
                    )}
                  </div>
                  <div className="pb-5 pt-0.5 min-w-0">
                    <p className={clsx(
                      'text-sm leading-tight',
                      step.state === 'done'     ? 'font-semibold text-gray-900' :
                      step.state === 'active'   ? 'font-semibold text-primary' :
                      step.state === 'rejected' ? 'font-semibold text-red-600' :
                      'text-gray-500',
                    )}>
                      {step.label}
                    </p>
                    {step.sub && <p className="text-xs text-gray-500 mt-1">{step.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {attachmentUrls.length > 0 && (
            <Card>
              <Eyebrow>Attachments · {attachmentUrls.length}</Eyebrow>
              <div className="flex flex-col gap-2 mt-4">
                {attachmentUrls.map(url => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-[#F3F7FD] px-3 py-2.5 hover:bg-secondary transition min-w-0"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center shrink-0">
                      <RiFile3Line size={17} />
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate" title={fileNameOf(url)}>{fileNameOf(url)}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* What happens next */}
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Eyebrow>{next.eyebrow}</Eyebrow>
              <h2 className="text-xl font-bold text-gray-900">{next.title}</h2>
              <span className={clsx('inline-flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-full text-sm font-semibold', next.chipClass)}>
                {needsMySignature && !isClosed ? <RiPenNibLine size={15} /> : <RiCheckLine size={15} />} {next.chip}
              </span>
              {next.note && <p className="text-sm text-gray-600">{next.note}</p>}
              {cancelRejection && (
                <p className="text-sm text-gray-600">
                  Your cancellation request was declined{cancelRejection.comment ? `: ${cancelRejection.comment}` : ''}. The request continues as normal.
                </p>
              )}
            </div>

            {holder && (
              <div className="flex items-center gap-3 rounded-xl bg-[#F3F7FD] px-4 py-3">
                <Avatar name={holder.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{holder.role}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{holder.name}</p>
                </div>
                {holder.email && (
                  <a
                    href={`mailto:${holder.email}?subject=${encodeURIComponent(`Request #${String(req.id).padStart(4, '0')} — ${req.title}`)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-800 hover:border-primary hover:text-primary transition"
                  >
                    <RiMailLine size={15} /> Contact
                  </a>
                )}
              </div>
            )}
          </Card>

          {/* Document */}
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1">
                <Eyebrow>Document</Eyebrow>
                <p className="text-sm text-gray-600 mt-2">
                  {isCompleted
                    ? 'Your document is ready to download.'
                    : 'Preview anytime — it updates as each person signs.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadDocument}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-800 hover:border-primary hover:text-primary transition"
                >
                  <RiDownloadLine size={16} /> Download PDF
                </button>
                <button
                  onClick={() => {
                    // Re-read the document so approvals since the page loaded show up
                    loadGeneratedDoc(Number(id));
                    setShowPreview(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition"
                >
                  <RiEyeLine size={16} /> View document
                </button>
              </div>
            </div>

            {needsMySignature && (
              <button
                onClick={() => setShowSignModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition w-fit"
              >
                <RiPenNibLine size={16} /> Sign your document
              </button>
            )}

            {requiredSigRoles.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  Signatures <span className="font-normal text-gray-500">· {signatures.filter(s => requiredSigRoles.includes(s.role)).length} of {requiredSigRoles.length}</span>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {requiredSigRoles.map(role => {
                    const sig = signatures.find(s => s.role === role);
                    const waiting = !sig && !isClosed && (role === 'student' ? needsMySignature : sigTurn(role, workflowStatus));
                    return (
                      <div
                        key={role}
                        className={clsx(
                          'flex items-center gap-3 rounded-xl px-3 py-3',
                          sig ? 'bg-green-50' : 'border border-dashed border-gray-300',
                        )}
                      >
                        {sig ? (
                          <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0"><RiCheckLine size={14} /></div>
                        ) : (
                          <div className={clsx('w-6 h-6 rounded-full border-2 shrink-0', waiting ? 'border-primary' : 'border-gray-300')} />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{SIG_ROLE_LABEL[role] ?? role}</p>
                          <p className={clsx('text-xs', sig ? 'text-green-700' : 'text-gray-500')}>
                            {sig ? `Signed ${new Date(sig.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}` : waiting ? 'Waiting' : 'Not yet'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Request details */}
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Eyebrow>Request details</Eyebrow>
              <button
                onClick={() => setShowDetails(v => !v)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {showDetails ? <>Hide <RiArrowUpSLine size={16} /></> : <>Show <RiArrowDownSLine size={16} /></>}
              </button>
            </div>
            {showDetails && (
              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500">Request type</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{req.requestType}</p>
                </div>
                {formEntries.map(([key, value]) => (
                  <div key={key} className={clsx(String(value).length > 60 && 'sm:col-span-2')}>
                    <p className="text-xs text-gray-500">{templateLabels[key] ?? humanize(key)}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1 whitespace-pre-line break-words">{String(value)}</p>
                  </div>
                ))}
                {req.description && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1 whitespace-pre-line">{req.description}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Comments */}
          {comments.length > 0 && (
            <Card className="flex flex-col gap-4">
              <Eyebrow>Comments</Eyebrow>
              <div className="border-t border-gray-100 pt-4 flex flex-col gap-4">
                {comments.map(e => (
                  <div key={e.id} className="flex gap-3">
                    <Avatar name={e.actor?.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold text-gray-900">{shortName(e.actor?.name) || ROLE_LABEL[e.actorRole ?? '']}</span>
                        <span className="text-xs text-primary font-medium ml-2">{ROLE_LABEL[e.actorRole ?? ''] ?? e.actorRole}</span>
                        <span className="text-xs text-gray-500"> · {fmtDateTime(e.createdAt)}</span>
                      </p>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-line break-words">{e.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-800">Request Cancellation</p>
              <button onClick={() => setShowCancelModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                <RiCloseLine size={18} />
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="text-sm text-gray-500">
                Your cancellation will be sent to staff for approval. The request is put on hold until they decide.
              </p>
              <label className="text-xs font-semibold text-gray-600">
                Reason<span className="text-red-400 ml-0.5">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={4}
                placeholder="Why do you want to cancel this request?"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowCancelModal(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
                Back
              </button>
              <button
                onClick={handleRequestCancel}
                disabled={!cancelReason.trim() || cancelSubmitting}
                className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelSubmitting ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignModal && genDoc && fullReq && (
        <SignatureModal
          docId={genDoc.id}
          myRole="student"
          signatures={signatures}
          requiredRoles={requiredSigRoles}
          signingMethod={fullReq?.requestType?.documentTemplates?.[0]?.signingMethod ?? 'digital'}
          fileUrl={genDoc.signedFileUrl ?? genDoc.fileUrl}
          onSigned={handleSigned}
          onClose={() => setShowSignModal(false)}
        />
      )}

      {/* Document Preview Modal */}
      {showPreview && fullReq && (() => {
        const attachments: string[] = (() => { try { return JSON.parse(fullReq.attachments ?? '[]'); } catch { return []; } })();
        const templates = fullReq.requestType?.documentTemplates ?? [];
        const formDataObj: Record<string, string> = (() => { try { return JSON.parse(fullReq.formData ?? '{}'); } catch { return {}; } })();
        const s = fullReq.student;
        const levelMap: Record<string, string> = { PHD: 'Doctoral', MASTER: "Master's", BACHELOR: "Bachelor's" };
        const baseVars: Record<string, string> = {
          student_name: [s?.titleEn, s?.firstNameEn, s?.lastNameEn].filter(Boolean).join(' ') || '—',
          student_id: s?.studentId ?? '—',
          student_title: s?.titleEn ?? '—',
          thai_tel: s?.phone ?? '—',
          email: s?.email ?? '—',
          education_level: levelMap[(s as { level?: string })?.level ?? ''] ?? '—',
          program: s?.program ?? '—',
          passport_number: s?.passports?.[0]?.passportNumber ?? '—',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
          ...formDataObj,
        };

        function renderTemplate(body: string) {
          if (body.includes('data-var=')) {
            return body.replace(/<span[^>]*data-var="(\{\{[^"]+\}\})"[^>]*>[^<]*<\/span>/g, (_, token) => {
              const key = token.slice(2, -2);
              return baseVars[key] ?? token;
            });
          }
          if (body.includes('{{')) {
            return body.replace(/\{\{(\w+)\}\}/g, (_, key) => baseVars[key] ?? `{{${key}}}`);
          }
          return body;
        }

        const printHtml = attachments.length > 0
          ? attachments.map((url, i) => `<p><a href="${url}">Document ${i + 1}</a></p>`).join('')
          : templates.map(t => {
              const tplVars: string[] = (() => { try { return JSON.parse(t.variables ?? '[]'); } catch { return []; } })();
              const sigVars = tplVars.filter((v: string) => v.startsWith('{{sig_'));
              const studentFullName = [s?.titleEn, s?.firstNameEn, s?.lastNameEn].filter(Boolean).join(' ') || '—';
              const SIG_NAMES: Record<string, string> = { '{{sig_student}}': studentFullName, '{{sig_advisor}}': '', '{{sig_ir_staff}}': '', '{{sig_dean}}': deanName };
              const SIG_ROLES: Record<string, string> = { '{{sig_student}}': 'Student', '{{sig_advisor}}': 'Advisor', '{{sig_ir_staff}}': 'IR Staff', '{{sig_dean}}': 'Dean' };
              const sigHtml = sigVars.length > 0
                ? `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:grid;grid-template-columns:repeat(${Math.min(sigVars.length, 4)},1fr);gap:24px">${sigVars.map((sv: string) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;height:40px;border-bottom:2px solid #1f2937;margin-top:16px"></div>${SIG_NAMES[sv] ? `<span style="font-size:11px;font-weight:600">${SIG_NAMES[sv]}</span>` : ''}<span style="font-size:11px;color:#6b7280">${SIG_ROLES[sv] ?? sv}</span></div>`).join('')}</div>`
                : '';
              return renderTemplate(t.body) + sigHtml;
            }).join('<hr style="margin:32px 0"/>');

        const safeTitle = req.title.replace(/[^a-z0-9]+/gi, '_');

        const saveBlob = async (blob: Blob, filename: string) => {
          const a = document.createElement('a');
          const objUrl = URL.createObjectURL(blob);
          a.href = objUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objUrl);
        };

        const handleDownload = async () => {
          try {
            if (genDoc) {
              const blob = (await generatedDocApi.download(genDoc.id)).data;
              await saveBlob(blob, `${safeTitle}.pdf`);
            } else if (attachments.length > 0) {
              for (let i = 0; i < attachments.length; i++) {
                const fileId = fullReq.attachmentFileIds?.[i];
                if (!fileId) continue;
                const blob = (await fileApi.download(fileId)).data;
                const ext = fileExtension(attachments[i]) || 'pdf';
                await saveBlob(blob, `${safeTitle}_${i + 1}.${ext}`);
              }
            } else {
              const pages = Array.from(previewContentRef.current?.querySelectorAll('.pdf-page') ?? []) as HTMLElement[];
              if (pages.length === 0) return;
              const pdf = new jsPDF('p', 'mm', 'a4');
              for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/jpeg', 0.92);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
              }
              pdf.save(`${safeTitle}.pdf`);
            }
          } catch {
            toast.error('Failed to download document');
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
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
                <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                  <RiCloseLine size={18} />
                </button>
              </div>

              <div ref={previewContentRef} className="flex-1 overflow-y-auto bg-gray-100 px-6 py-6 flex flex-col gap-6">
                {genDoc && (
                  <div className="w-full max-w-[210mm] mx-auto flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-primary/5 text-primary">
                    <RiFileTextLine size={13} />
                    {genDoc.signedFileUrl
                      ? requiredSigRoles.length > 0
                        ? `Showing the document (${signatures.length}/${requiredSigRoles.length} signed)`
                        : 'Showing the signed document'
                      : 'Showing the generated document (not yet signed)'}
                  </div>
                )}

                {genDoc ? (
                  <div className="bg-white shadow-md mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
                    <iframe
                      src={genDoc.signedFileUrl ?? genDoc.fileUrl ?? undefined}
                      style={{ width: '100%', height: '297mm', border: 'none' }}
                      title="Generated Document"
                    />
                  </div>
                ) : attachments.length > 0 ? (
                  attachments.map((url, i) => {
                    const isPdf = isPdfUrl(url);
                    const isImage = isImageUrl(url);
                    if (isPdf) return (
                      <div key={i} className="bg-white shadow-md mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
                        <iframe src={url} style={{ width: '100%', height: '297mm', border: 'none' }} title={`Document ${i + 1}`} />
                      </div>
                    );
                    if (isImage) return (
                      <div key={i} className="bg-white shadow-md mx-auto p-4" style={{ width: '210mm' }}>
                        <img src={url} alt={`Document ${i + 1}`} className="max-w-full" />
                      </div>
                    );
                    return (
                      <div key={i} className="bg-white shadow-md mx-auto p-6" style={{ width: '210mm' }}>
                        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
                          <RiFileTextLine size={14} /> Document {i + 1}
                        </a>
                      </div>
                    );
                  })
                ) : templates.length > 0 ? (
                  templates.map((tpl) => {
                    const tplVars: string[] = (() => { try { return JSON.parse(tpl.variables ?? '[]'); } catch { return []; } })();
                    const sigVars = tplVars.filter((v: string) => v.startsWith('{{sig_'));
                    const studentFullName = [s?.titleEn, s?.firstNameEn, s?.lastNameEn].filter(Boolean).join(' ') || '—';
                    const SIG_NAMES: Record<string, string> = { '{{sig_student}}': studentFullName, '{{sig_advisor}}': '', '{{sig_ir_staff}}': '', '{{sig_dean}}': deanName };
                    const SIG_ROLES: Record<string, string> = { '{{sig_student}}': 'Student', '{{sig_advisor}}': 'Advisor', '{{sig_ir_staff}}': 'IR Staff', '{{sig_dean}}': 'Dean' };
                    return (
                      <div key={tpl.id} className="pdf-page bg-white shadow-md mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '25mm 20mm', fontFamily: "'Times New Roman', serif", fontSize: '14px', color: '#222', lineHeight: '2' }}>
                        <div dangerouslySetInnerHTML={{ __html: renderTemplate(tpl.body) }} />
                        {sigVars.length > 0 && (
                          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(sigVars.length, 4)}, 1fr)`, gap: '24px' }}>
                              {sigVars.map((sv: string) => (
                                <div key={sv} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <div style={{ width: '100%', height: '40px', borderBottom: '2px solid #1f2937', marginTop: '16px' }} />
                                  {SIG_NAMES[sv] && <span style={{ fontSize: '11px', fontWeight: 600 }}>{SIG_NAMES[sv]}</span>}
                                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{SIG_ROLES[sv] ?? sv}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white shadow-md mx-auto p-10 flex items-center justify-center" style={{ width: '210mm', minHeight: '200px' }}>
                    <p className="text-gray-400 text-sm">No document available.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => {
                    if (genDoc) {
                      window.open(genDoc.signedFileUrl ?? genDoc.fileUrl ?? '', '_blank');
                    } else if (attachments.length > 0) {
                      attachments.forEach(url => window.open(url, '_blank'));
                    } else {
                      const origin = window.location.origin;
                      const html = printHtml.replace(/src="\/kkulogo2\.png"/g, `src="${origin}/kkulogo2.png"`);
                      const pw = window.open('', '_blank');
                      if (!pw) return;
                      pw.document.write(`<!DOCTYPE html><html><head><title>${req.title}</title><style>body{margin:25mm 20mm;font-family:'Times New Roman',serif;font-size:14px;color:#222;line-height:2;}@media print{@page{margin:0;}body{margin:25mm 20mm;}}hr{margin:32px 0;border:none;border-top:1px solid #e5e7eb}</style></head><body>${html}</body></html>`);
                      pw.document.close();
                      pw.focus();
                      pw.print();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
                >
                  <RiPrinterLine size={14} /> Print
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition"
                  >
                    <RiDownloadLine size={14} /> Download
                  </button>
                  <button onClick={() => setShowPreview(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
