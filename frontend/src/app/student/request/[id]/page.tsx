'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { requestApi, deanApi, generatedDocApi, type ApiRequest, type ApiDocSignature, type ApiGeneratedDoc } from '@/lib/api';
import SignatureModal from '@/components/SignatureModal';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  RiArrowLeftLine, RiCheckLine, RiTimeLine, RiCloseCircleLine,
  RiFileTextLine, RiCalendarLine, RiInformationLine, RiEyeLine,
  RiCloseLine, RiPrinterLine, RiDownloadLine, RiPenNibLine,
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
  advisorComment: string | null;
  staffComment: string | null;
  deanComment: string | null;
  description: string | null;
}

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
    'STAFF_APPROVED',
    'FORWARDED_TO_ADVISOR',
    'ADVISOR_APPROVED',
    'FORWARDED_TO_DEAN',
    'DEAN_APPROVED',
  ];

  const labels: Record<string, string> = {
    PENDING:              'Submitted',
    STAFF_APPROVED:       'Staff Approved',
    FORWARDED_TO_ADVISOR: 'Forwarded to Advisor',
    ADVISOR_APPROVED:     'Advisor Reviewed',
    FORWARDED_TO_DEAN:    'Forwarded to Dean',
    DEAN_APPROVED:        'Completed',
  };

  const rejectedAt: Partial<Record<RequestStatus, string>> = {
    STAFF_REJECTED:   'PENDING',
    ADVISOR_REJECTED: 'FORWARDED_TO_ADVISOR',
    DEAN_REJECTED:    'FORWARDED_TO_DEAN',
    CANCELLED:        'PENDING',
  };

  const isRejected = status in rejectedAt;
  const rejectedAfter = rejectedAt[status];
  const currentIndex = isRejected
    ? order.indexOf(rejectedAfter as RequestStatus)
    : order.indexOf(status);

  const isFinalDone = status === 'DEAN_APPROVED';

  return order.map((s, i) => {
    let state: StepState = 'idle';
    if (isRejected) {
      if (i < currentIndex) state = 'done';
      else if (i === currentIndex) state = 'rejected';
      else state = 'idle';
    } else if (isFinalDone) {
      state = 'done';
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
  const [showSignModal, setShowSignModal] = useState(false);
  const [reqData, setReqData] = useState<RequestDetail | null>(null);
  const [fullReq, setFullReq] = useState<ApiRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deanName, setDeanName] = useState('');
  const [genDoc, setGenDoc] = useState<ApiGeneratedDoc | null>(null);
  const [signatures, setSignatures] = useState<ApiDocSignature[]>([]);
  const previewContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    deanApi.getSignatory().then(r => setDeanName(r.data.data.name)).catch(() => {});
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
          advisorComment: r.advisorComment ?? null,
          staffComment: r.staffComment ?? null,
          deanComment: r.deanComment ?? null,
          description: r.description ?? null,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    generatedDocApi.getByRequest(Number(id))
      .then(res => {
        const doc = res.data.data[0] ?? null;
        setGenDoc(doc);
        if (doc) {
          generatedDocApi.getSignatures(doc.id).then(r => setSignatures(r.data.data)).catch(() => {});
        }
      })
      .catch(() => {});
  }, [id]);

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
  const statusCfg = STATUS_CONFIG[req.status];
  const timeline = buildTimeline(req.status);

  const isRejected = ['STAFF_REJECTED', 'ADVISOR_REJECTED', 'DEAN_REJECTED', 'CANCELLED'].includes(req.status);
  const isCompleted = req.status === 'DEAN_APPROVED';

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className={clsx(
          'px-6 py-5 flex items-center gap-4',
          isCompleted ? 'bg-green-400'
            : isRejected ? 'bg-red-400'
            : 'bg-primary/80'
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
          {isRejected && (
            req.status === 'ADVISOR_REJECTED' ? req.advisorComment :
            req.status === 'DEAN_REJECTED'    ? req.deanComment :
            req.staffComment
          ) && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex gap-3">
              <RiCloseCircleLine size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Request Rejected</p>
                <p className="text-sm text-red-600 mt-1">
                  {req.status === 'ADVISOR_REJECTED' ? req.advisorComment :
                   req.status === 'DEAN_REJECTED'    ? req.deanComment :
                   req.staffComment}
                </p>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex gap-3">
              <RiCheckLine size={18} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-700">Request Completed</p>
                {req.deanComment
                  ? <p className="text-sm text-green-600 mt-1">{req.deanComment}</p>
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
                  {req.status === 'STAFF_APPROVED' && 'Staff has approved. The request will be forwarded to your advisor.'}
                  {req.status === 'FORWARDED_TO_ADVISOR' && 'Your request has been forwarded to your advisor for review.'}
                  {req.status === 'ADVISOR_APPROVED' && 'Your advisor has approved. The request will be forwarded to the Dean.'}
                  {req.status === 'FORWARDED_TO_DEAN' && 'Your request is pending Dean approval.'}
                </p>
              </div>
            )}

            {/* Advisor comment */}
            {req.advisorComment && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Advisor Comment</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{req.advisorComment}</p>
              </div>
            )}

            {/* Staff comment */}
            {req.staffComment && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Staff Comment</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{req.staffComment}</p>
              </div>
            )}

            {/* Dean comment */}
            {req.deanComment && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dean Comment</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{req.deanComment}</p>
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPreview(true)}
                disabled={!isCompleted}
                className={clsx(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition',
                  isCompleted
                    ? 'bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <RiEyeLine size={15} /> View Document
              </button>

              {genDoc && !signatures.some(s => s.role === 'student') && (
                <button
                  onClick={() => setShowSignModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-sm transition"
                >
                  <RiPenNibLine size={15} /> Sign Document
                </button>
              )}
              {genDoc && signatures.some(s => s.role === 'student') && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                  <RiCheckLine size={14} /> You have signed
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

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
              const url = genDoc.signedFileUrl ?? genDoc.fileUrl;
              if (!url) return;
              const res = await fetch(url);
              const blob = await res.blob();
              await saveBlob(blob, `${safeTitle}.pdf`);
            } else if (attachments.length > 0) {
              for (let i = 0; i < attachments.length; i++) {
                const url = attachments[i];
                const res = await fetch(url);
                const blob = await res.blob();
                const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
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
                    const isPdf = /\.pdf$/i.test(url);
                    const isImage = /\.(png|jpe?g|gif|webp)$/i.test(url);
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
