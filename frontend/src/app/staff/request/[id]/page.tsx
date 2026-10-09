'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiUser3Line, RiFileTextLine, RiCalendarLine, RiUserStarLine, RiCloseLine, RiPrinterLine, RiDownloadLine, RiEyeLine, RiCheckLine, RiAttachmentLine, RiPenNibLine, RiMailSendLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import SignatureModal from '@/components/SignatureModal';
import { requestApi, deanApi, generatedDocApi, type ApiRequest, type ApiDocSignature, type ApiGeneratedDoc } from '@/lib/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type RequestStatus = 'PENDING' | 'FORWARDED_TO_ADVISOR' | 'ADVISOR_APPROVED' | 'ADVISOR_REJECTED' | 'STAFF_APPROVED' | 'STAFF_REJECTED' | 'FORWARDED_TO_DEAN' | 'DEAN_APPROVED' | 'DEAN_REJECTED' | 'CANCELLED';

// Statuses where the request has finished its workflow — no further staff/advisor/dean action pending.
const TERMINAL_STATUSES: RequestStatus[] = ['DEAN_APPROVED', 'ADVISOR_REJECTED', 'STAFF_REJECTED', 'DEAN_REJECTED', 'CANCELLED'];

const statusLabelConfig: Record<string, { label: string; className: string }> = {
  PENDING:              { label: 'Pending',               className: 'bg-yellow-100 text-yellow-700' },
  FORWARDED_TO_ADVISOR: { label: 'Forwarded to Advisor',  className: 'bg-blue-100 text-blue-700' },
  ADVISOR_APPROVED:     { label: 'Advisor Approved',      className: 'bg-teal-100 text-teal-700' },
  ADVISOR_REJECTED:     { label: 'Advisor Rejected',      className: 'bg-orange-100 text-orange-700' },
  STAFF_APPROVED:       { label: 'Staff Approved',        className: 'bg-indigo-100 text-indigo-700' },
  STAFF_REJECTED:       { label: 'Cancelled',             className: 'bg-red-100 text-red-600' },
  FORWARDED_TO_DEAN:    { label: 'Forwarded to Dean',     className: 'bg-purple-100 text-purple-700' },
  DEAN_APPROVED:        { label: 'Completed',             className: 'bg-green-100 text-green-700' },
  DEAN_REJECTED:        { label: 'Dean Rejected',         className: 'bg-red-100 text-red-600' },
  CANCELLED:            { label: 'Cancelled',             className: 'bg-red-100 text-red-600' },
};

export default function StaffRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [req, setReq] = useState<ApiRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [comment, setComment] = useState('');
  const [showRejectError, setShowRejectError] = useState(false);
  const [followingUp, setFollowingUp] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [deanName, setDeanName] = useState('');
  const [genDoc, setGenDoc] = useState<ApiGeneratedDoc | null>(null);
  const [signatures, setSignatures] = useState<ApiDocSignature[]>([]);

  useEffect(() => {
    deanApi.getSignatory().then(r => setDeanName(r.data.data.name)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    requestApi.getById(Number(id))
      .then(res => setReq(res.data.data))
      .catch(() => {})
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

  async function updateStatus(status: string, requireComment = false) {
    if (!req) return;
    if (requireComment && !comment.trim()) {
      setShowRejectError(true);
      return;
    }
    setShowRejectError(false);
    try {
      const res = await requestApi.updateStatus(req.id, status, comment || undefined, attachedFiles.length > 0 ? attachedFiles : undefined);
      setReq(prev => prev ? { ...prev, status, attachments: res.data.data.attachments } : prev);
      setAttachedFiles([]);
      setComment('');
      if (attachInputRef.current) attachInputRef.current.value = '';
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  }

  async function handleGeneratePdf() {
    const template = req?.requestType?.documentTemplates?.[0];
    if (!req || !template) return;
    setGeneratingPdf(true);
    try {
      const formData = (() => { try { return JSON.parse(req.formData ?? '{}'); } catch { return {}; } })();
      const res = await generatedDocApi.generate(req.id, template.id, formData);
      setGenDoc(res.data.data);
      toast.success('PDF generated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handleSigned(updated: ApiDocSignature[]) {
    setSignatures(updated);
    if (genDoc) generatedDocApi.getById(genDoc.id).then(r => setGenDoc(r.data.data)).catch(() => {});
  }

  const requiredSigRoles: string[] = (() => {
    try {
      const vars: string[] = JSON.parse(req?.requestType?.documentTemplates?.[0]?.variables ?? '[]');
      return vars.filter((v: string) => v.startsWith('{{sig_')).map((v: string) => v.slice(6, -2));
    } catch { return []; }
  })();

  async function handleFollowUp() {
    if (!req) return;
    setFollowingUp(true);
    try {
      const res = await requestApi.followUp(req.id);
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to send follow-up reminder');
    } finally {
      setFollowingUp(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-6 animate-pulse flex flex-col gap-5">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="flex gap-5 flex-1">
          <div className="lg:w-72 bg-gray-100 rounded-2xl" />
          <div className="flex-1 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-6 flex items-center justify-center">
        <p className="text-gray-400">Request not found</p>
      </div>
    );
  }

  const statusCfg = statusLabelConfig[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-500' };
  const studentName = [req.student?.firstNameEn, req.student?.lastNameEn].filter(Boolean).join(' ') || '—';
  const advisorName = '—'; // advisor info not in request response directly

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
        <h1 className="text-2xl font-semibold text-primary">Req#{String(req.id).padStart(4, '0')}</h1>
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
              { icon: RiUser3Line,    label: 'Name',          value: studentName },
              { icon: RiFileTextLine, label: 'Document Type', value: req.requestType?.name ?? req.title },
              { icon: RiCalendarLine, label: 'Start Request', value: new Date(req.createdAt).toLocaleDateString('en-GB') },
              { icon: RiUserStarLine, label: 'Advisor',       value: advisorName },
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

          {/* Follow Up Button — shown once a non-finished request has sat in the same status for 3+ days */}
          {!TERMINAL_STATUSES.includes(req.status as RequestStatus) &&
            (Date.now() - new Date(req.updatedAt).getTime()) >= 3 * 86_400_000 && (
            <button
              onClick={handleFollowUp}
              disabled={followingUp}
              title="Remind whoever is responsible for this request's current step"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 text-sm font-medium hover:bg-amber-100 transition-all duration-200 disabled:opacity-50"
            >
              <RiMailSendLine size={16} />
              {followingUp ? 'Sending…' : 'Follow Up'}
            </button>
          )}

          {/* Generate PDF Button — required before a document can be signed */}
          {!genDoc && (req.requestType?.documentTemplates?.length ?? 0) > 0 && (
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
            >
              <RiFileTextLine size={16} />
              {generatingPdf ? 'Generating…' : 'Generate PDF'}
            </button>
          )}

          {/* Sign Document Button */}
          {genDoc && !signatures.some(s => s.role === 'ir_staff') && (
            <button
              onClick={() => setShowSignModal(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all duration-200"
            >
              <RiPenNibLine size={16} />
              Sign Document
            </button>
          )}
          {genDoc && signatures.some(s => s.role === 'ir_staff') && (
            <div className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              <RiCheckLine size={14} /> Signed (IR Staff)
            </div>
          )}

          {/* Attach Files + Action Buttons */}
          {(req.status === 'PENDING' || req.status === 'ADVISOR_APPROVED' || req.status === 'STAFF_APPROVED') && (
            <div className="flex flex-col gap-2">
              {/* Staff comment */}
              <div className="flex flex-col gap-1">
                <textarea
                  value={comment}
                  onChange={e => { setComment(e.target.value); setShowRejectError(false); }}
                  placeholder="Enter your comment here..."
                  rows={3}
                  className={`w-full border rounded-xl px-4 py-3 text-sm text-primary placeholder-gray-400 bg-gray-50 outline-none focus:border-primary transition-colors resize-none ${showRejectError ? 'border-red-400' : 'border-gray-200'}`}
                />
                {showRejectError && (
                  <p className="text-xs text-red-500 pl-1">กรุณากรอกเหตุผลก่อนปฏิเสธคำร้อง</p>
                )}
              </div>

              {/* File attachment */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 w-full cursor-pointer px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors">
                  <RiAttachmentLine size={15} />
                  Attach files
                  <input
                    ref={attachInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length === 0) return;
                      setAttachedFiles(prev => [...prev, ...files]);
                    }}
                  />
                </label>
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5 text-xs text-primary">
                        <span className="max-w-[130px] truncate">{file.name}</span>
                        <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                          <RiCloseLine size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {req.status === 'PENDING' && (
                <>
                  <Button variant="primary" label="Approve"  onClick={() => updateStatus('STAFF_APPROVED')} />
                  <Button variant="danger"  label="Reject"   onClick={() => updateStatus('STAFF_REJECTED', true)} />
                </>
              )}
              {req.status === 'STAFF_APPROVED' && (
                <>
                  <Button variant="primary" label="Send to Advisor" onClick={() => updateStatus('FORWARDED_TO_ADVISOR')} />
                  <Button variant="danger"  label="Reject"          onClick={() => updateStatus('STAFF_REJECTED', true)} />
                </>
              )}
              {req.status === 'ADVISOR_APPROVED' && (
                <>
                  <Button variant="primary" label="Forward to Dean" onClick={() => updateStatus('FORWARDED_TO_DEAN')} />
                  <Button variant="danger"  label="Reject"          onClick={() => updateStatus('STAFF_REJECTED', true)} />
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Request Details */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <p className="text-sm font-semibold text-primary/50 uppercase tracking-wide">Request Details</p>
          <div className="border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase">Title</span>
              <span className="text-sm font-medium text-primary">{req.title}</span>
            </div>
            {req.description && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-400 uppercase">Description</span>
                <span className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{req.description}</span>
              </div>
            )}
            {req.advisorComment && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-400 uppercase">Advisor Comment</span>
                <span className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{req.advisorComment}</span>
              </div>
            )}
            {req.staffComment && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-400 uppercase">Staff Comment</span>
                <span className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{req.staffComment}</span>
              </div>
            )}
            {req.deanComment && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-400 uppercase">Dean Comment</span>
                <span className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{req.deanComment}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Student</span>
                <p className="text-primary font-medium mt-0.5">{studentName}</p>
                {req.student?.email && <p className="text-xs text-gray-400">{req.student.email}</p>}
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Program</span>
                <p className="text-primary mt-0.5">{req.student?.program ?? '—'}</p>
              </div>
            </div>
          </div>

          <p className="text-sm font-semibold text-primary/50 uppercase tracking-wide mt-2">Activity Log</p>
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left   py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left   py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Event</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(req.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="py-3 px-4 text-primary font-medium">Request created</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                      <RiCheckLine size={12} /> finished
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(req.updatedAt).toLocaleDateString('en-GB')}</td>
                  <td className="py-3 px-4 text-primary font-medium">Status: {statusCfg.label}</td>
                  <td className="py-3 px-4 text-center">
                    {TERMINAL_STATUSES.includes(req.status as RequestStatus) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                        <RiCheckLine size={12} /> finished
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block animate-pulse" /> pending
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignModal && genDoc && (
        <SignatureModal
          docId={genDoc.id}
          myRole="ir_staff"
          signatures={signatures}
          requiredRoles={requiredSigRoles}
          signingMethod={req?.requestType?.documentTemplates?.[0]?.signingMethod ?? 'digital'}
          fileUrl={genDoc.signedFileUrl ?? genDoc.fileUrl}
          onSigned={handleSigned}
          onClose={() => setShowSignModal(false)}
        />
      )}

      {/* Document Preview Modal */}
      {showModal && (() => {
        const templates = req.requestType?.documentTemplates ?? [];
        const attachments: string[] = (() => { try { return JSON.parse(req.attachments ?? '[]'); } catch { return []; } })();
        const formDataObj: Record<string, string> = (() => { try { return JSON.parse(req.formData ?? '{}'); } catch { return {}; } })();
        const s = req.student;
        const levelMap: Record<string, string> = { PHD: 'Doctoral', MASTER: "Master's", BACHELOR: "Bachelor's" };
        const baseVars: Record<string, string> = {
          student_name: [s?.titleEn, s?.firstNameEn, s?.lastNameEn].filter(Boolean).join(' ') || '—',
          student_id: s?.studentId ?? '—',
          student_title: s?.titleEn ?? '—',
          thai_tel: s?.phone ?? '—',
          email: s?.email ?? '—',
          education_level: levelMap[(s as { level?: string })?.level ?? ''] ?? (s as { level?: string })?.level ?? '—',
          program: s?.program ?? '—',
          passport_number: s?.passports?.[0]?.passportNumber ?? '—',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
          ...formDataObj,
        };

        // label text → variable key (for templates saved without data-var)
        const LABEL_TO_KEY: Record<string, string> = {
          'Student Name': 'student_name', 'Student Full Name': 'student_name',
          'Student ID': 'student_id',
          'Title (Mr./Mrs./Miss)': 'student_title',
          'Thai Tel. No.': 'thai_tel',
          'Email': 'email', 'Email Address': 'email',
          'Education Level': 'education_level',
          'Funding Type': 'funding_type',
          'Scholarship Name': 'scholarship_name',
          'Program': 'program',
          'Destination City & Country': 'destination', 'Destination (City & Country)': 'destination',
          'Purpose of Leave': 'purpose', 'Purpose of Travel': 'purpose',
          'Duration (days/months)': 'duration_days',
          'Leave Start Date': 'leave_start',
          'Leave End Date': 'leave_end', 'Leave Return Date': 'leave_end',
          'Visa Expiry': 'visa_expiry', 'Visa Expiry Date': 'visa_expiry',
          'Advisor Name': 'advisor_name',
          'Current Date': 'date',
        };

        function renderTemplate(body: string) {
          // Case 1: has data-var attributes (new format)
          if (body.includes('data-var=')) {
            return body.replace(/<span[^>]*data-var="(\{\{[^"]+\}\})"[^>]*>[^<]*<\/span>/g, (_, token) => {
              const key = token.slice(2, -2);
              return baseVars[key] ?? token;
            });
          }
          // Case 2: has {{key}} plain tokens
          if (body.includes('{{')) {
            return body.replace(/\{\{(\w+)\}\}/g, (_, key) => baseVars[key] ?? `{{${key}}}`);
          }
          // Case 3: old format — chips saved as <span>Label</span> without data-var
          return body.replace(/<span[^>]*>([^<]+)<\/span>/g, (match, text) => {
            const key = LABEL_TO_KEY[text.trim()];
            return key && baseVars[key] ? baseVars[key] : text;
          });
        }

        const printContent = templates.map(t => {
          const tplVars: string[] = (() => { try { return JSON.parse(t.variables ?? '[]'); } catch { return []; } })();
          const sigVars = tplVars.filter((v: string) => v.startsWith('{{sig_'));
          const studentFullName = [s?.titleEn, s?.firstNameEn, s?.lastNameEn].filter(Boolean).join(' ') || '—';
          const SIG_NAMES: Record<string, string> = { '{{sig_student}}': studentFullName, '{{sig_advisor}}': '', '{{sig_ir_staff}}': '', '{{sig_dean}}': deanName };
          const SIG_ROLES: Record<string, string> = { '{{sig_student}}': 'Student', '{{sig_advisor}}': 'Advisor', '{{sig_ir_staff}}': 'IR Staff', '{{sig_dean}}': 'Dean' };
          const sigHtml = sigVars.length > 0
            ? `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:grid;grid-template-columns:repeat(${Math.min(sigVars.length, 4)},1fr);gap:24px">${sigVars.map((sv: string) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;height:40px;border-bottom:2px solid #1f2937;margin-top:16px"></div>${SIG_NAMES[sv] ? `<span style="font-size:11px;font-weight:600;text-align:center">${SIG_NAMES[sv]}</span>` : ''}<span style="font-size:11px;color:#6b7280">${SIG_ROLES[sv] ?? sv}</span><span style="font-size:10px;color:#9ca3af">Date ....../....../......</span></div>`).join('')}</div>`
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col overflow-hidden max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <p className="font-semibold text-primary">Document Preview</p>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200"
                >
                  <RiCloseLine size={16} />
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
                ) : templates.length === 0 && attachments.length === 0 ? (
                  <div className="w-full h-48 bg-white rounded-xl flex items-center justify-center text-gray-400 text-sm">
                    No document template or attachments for this request type.
                  </div>
                ) : attachments.length > 0 ? (
                  attachments.map((url, i) => {
                    const isPdf = /\.pdf$/i.test(url) || url.includes('application/pdf');
                    const isImage = /\.(png|jpe?g|gif|webp)$/i.test(url);
                    if (isPdf) {
                      return (
                        <div key={i} className="bg-white shadow-md mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
                          <iframe src={url} style={{ width: '100%', height: '297mm', border: 'none' }} title={`Document ${i + 1}`} />
                        </div>
                      );
                    }
                    if (isImage) {
                      return (
                        <div key={i} className="bg-white shadow-md mx-auto p-4" style={{ width: '210mm' }}>
                          <img src={url} alt={`Document ${i + 1}`} className="max-w-full" />
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="bg-white shadow-md mx-auto p-6" style={{ width: '210mm' }}>
                        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
                          <RiFileTextLine size={14} /> Document {i + 1}
                        </a>
                      </div>
                    );
                  })
                ) : (
                  templates.map((tpl) => {
                    const tplVars: string[] = (() => { try { return JSON.parse(tpl.variables ?? '[]'); } catch { return []; } })();
                    const sigVars = tplVars.filter((v: string) => v.startsWith('{{sig_'));
                    const studentFullName = [s?.titleEn, s?.firstNameEn, s?.lastNameEn].filter(Boolean).join(' ') || '—';
                    const SIG_NAMES: Record<string, string> = {
                      '{{sig_student}}':  studentFullName,
                      '{{sig_advisor}}':  '',
                      '{{sig_ir_staff}}': '',
                      '{{sig_dean}}':     deanName,
                    };
                    const SIG_ROLES: Record<string, string> = {
                      '{{sig_student}}':  'Student',
                      '{{sig_advisor}}':  'Advisor',
                      '{{sig_ir_staff}}': 'IR Staff',
                      '{{sig_dean}}':     'Dean',
                    };
                    return (
                      <div key={tpl.id} className="pdf-page bg-white shadow-md mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '25mm 20mm', fontFamily: "'Times New Roman', serif", fontSize: '14px', color: '#222', lineHeight: '2' }}>
                        <div dangerouslySetInnerHTML={{ __html: renderTemplate(tpl.body) }} />
                        {sigVars.length > 0 && (
                          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(sigVars.length, 4)}, 1fr)`, gap: '24px' }}>
                              {sigVars.map((sv: string) => (
                                <div key={sv} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <div style={{ width: '100%', height: '40px', borderBottom: '2px solid #1f2937', marginTop: '16px' }} />
                                  {SIG_NAMES[sv] && <span style={{ fontSize: '11px', fontWeight: 600, textAlign: 'center' }}>{SIG_NAMES[sv]}</span>}
                                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{SIG_ROLES[sv] ?? sv}</span>
                                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>Date ....../....../......</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                <Button variant="ghost" label="Close" onClick={() => setShowModal(false)} />
                <Button variant="info" label="Download" icon={RiDownloadLine} onClick={handleDownload} />
                <Button
                  variant="primary"
                  label="Print"
                  icon={RiPrinterLine}
                  onClick={() => {
                    if (genDoc) {
                      window.open(genDoc.signedFileUrl ?? genDoc.fileUrl ?? '', '_blank');
                    } else if (attachments.length > 0) {
                      // Open each attachment for printing
                      attachments.forEach(url => window.open(url, '_blank'));
                    } else {
                      const w = window.open('', '_blank');
                      if (!w) return;
                      const origin = window.location.origin;
                      const html = printContent.replace(/src="\/kkulogo2\.png"/g, `src="${origin}/kkulogo2.png"`);
                      w.document.write(`<!DOCTYPE html><html><head><title>Document Preview</title><style>body{font-family:'Times New Roman',serif;margin:25mm 20mm;font-size:14px;color:#222;line-height:2;}@media print{@page{margin:0;}body{margin:25mm 20mm;}}hr{margin:32px 0;border:none;border-top:1px solid #e5e7eb}</style></head><body>${html}</body></html>`);
                      w.document.close();
                      w.print();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
