'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { RiArrowLeftLine, RiUser3Line, RiFileTextLine, RiCalendarLine, RiAttachmentLine, RiCloseLine, RiCheckLine, RiEyeLine, RiPrinterLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { requestApi, type ApiRequest } from '@/lib/api';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:              { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  FORWARDED_TO_ADVISOR: { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  ADVISOR_APPROVED:     { label: 'Approved', className: 'bg-green-100 text-green-700' },
  ADVISOR_REJECTED:     { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  STAFF_APPROVED:       { label: 'Approved', className: 'bg-green-100 text-green-700' },
  STAFF_REJECTED:       { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  FORWARDED_TO_DEAN:    { label: 'Approved', className: 'bg-green-100 text-green-700' },
  DEAN_APPROVED:        { label: 'Completed', className: 'bg-green-100 text-green-700' },
  DEAN_REJECTED:        { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  CANCELLED:            { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
};

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<ApiRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const [comment, setComment] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showRejectError, setShowRejectError] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    requestApi.getById(Number(params.id))
      .then(res => setReq(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleApprove = async () => {
    if (!req) return;
    try {
      const res = await requestApi.updateStatus(req.id, 'ADVISOR_APPROVED', comment || undefined, attachedFiles.length > 0 ? attachedFiles : undefined);
      setReq(prev => prev ? { ...prev, status: 'ADVISOR_APPROVED', attachments: res.data.data.attachments } : prev);
      setActionDone(true);
      toast.success('Request approved');
    } catch {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!req) return;
    if (!comment.trim()) {
      setShowRejectError(true);
      return;
    }
    setShowRejectError(false);
    try {
      await requestApi.updateStatus(req.id, 'ADVISOR_REJECTED', comment);
      setReq(prev => prev ? { ...prev, status: 'ADVISOR_REJECTED' } : prev);
      setActionDone(true);
      toast.success('Request rejected');
    } catch {
      toast.error('Failed to reject request');
    }
  };

  if (!params?.id) return <div className="bg-white w-full flex-1 rounded-2xl p-8" />;

  if (loading) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-6 animate-pulse flex flex-col gap-5">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="flex gap-5 flex-1">
          <div className="lg:w-72 bg-gray-100 rounded-2xl h-64" />
          <div className="flex-1 bg-gray-100 rounded-2xl h-64" />
        </div>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-8 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Request not found</p>
        <Button variant="ghost" label="Back" onClick={() => router.back()} />
      </div>
    );
  }

  const cfg = statusConfig[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-500' };
  const isPending = req.status === 'FORWARDED_TO_ADVISOR';
  const studentName = [req.student?.firstNameEn, req.student?.lastNameEn].filter(Boolean).join(' ') || '—';

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
        <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', cfg.className)}>{cfg.label}</span>
      </div>

      {/* Success Banner */}
      {actionDone && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${req.status === 'ADVISOR_APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          <RiCheckLine size={16} />
          {req.status === 'ADVISOR_APPROVED' ? 'คำร้องได้รับการอนุมัติเรียบร้อยแล้ว' : 'คำร้องถูกปฏิเสธเรียบร้อยแล้ว'}
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {/* LEFT: Request Info */}
        <div className="flex flex-col gap-4 lg:w-72 shrink-0">
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Request Info</p>
            {[
              { icon: RiUser3Line,    label: 'Student',       value: studentName },
              { icon: RiFileTextLine, label: 'Document Type', value: req.requestType?.name ?? req.title },
              { icon: RiCalendarLine, label: 'Submitted',     value: new Date(req.createdAt).toLocaleDateString('en-GB') },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-primary/50">
                  <Icon size={13} />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <span className="text-sm font-semibold text-primary leading-snug pl-5">{value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary hover:text-white transition-all duration-200"
          >
            <RiEyeLine size={16} />
            View Document
          </button>
        </div>

        {/* RIGHT: Activity History + Advisor Response */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <p className="text-sm font-semibold text-primary/50 uppercase tracking-wide">Activity History</p>
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <td className="text-left   py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Date</td>
                  <td className="text-left   py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Detail</td>
                  <td className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</td>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(req.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="py-3 px-4 text-primary font-medium">Create New Request</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Finished
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(req.updatedAt).toLocaleDateString('en-GB')}</td>
                  <td className="py-3 px-4 text-primary font-medium">{cfg.label}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', isPending ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600')}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full inline-block', isPending ? 'bg-yellow-400' : 'bg-green-500')} />
                      {isPending ? 'In Progress' : 'Finished'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Advisor Response */}
          <div className="border border-gray-100 rounded-2xl p-5 flex flex-col gap-4 mt-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary/50 uppercase tracking-wide">Advisor Response</p>
              {!isPending && (
                <span className="text-xs text-gray-400 italic">This request has already been processed.</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <textarea
                value={comment}
                onChange={e => { setComment(e.target.value); setShowRejectError(false); }}
                disabled={!isPending}
                placeholder="Enter your comment here..."
                rows={3}
                className={`w-full border rounded-xl px-4 py-3 text-sm text-primary placeholder-gray-400 bg-gray-50 outline-none focus:border-primary transition-colors resize-none disabled:opacity-40 disabled:cursor-not-allowed ${showRejectError ? 'border-red-400' : 'border-gray-200'}`}
              />
              {showRejectError && (
                <p className="text-xs text-red-500 pl-1">กรุณากรอกเหตุผลก่อนปฏิเสธคำร้อง</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              {isPending && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 w-fit cursor-pointer px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors">
                    <RiAttachmentLine size={15} />
                    Attach files
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5 text-sm text-primary">
                          <span className="max-w-[140px] truncate text-xs">{file.name}</span>
                          <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <RiCloseLine size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isPending && <div />}

              <div className="flex items-center gap-3 shrink-0">
                <Button variant="danger"  label="Reject"  disabled={!isPending} onClick={handleReject} />
                <Button variant="success" label="Approve" disabled={!isPending} onClick={handleApprove} />
              </div>
            </div>
          </div>
        </div>
      </div>

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
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
          ...formDataObj,
        };

        const LABEL_TO_KEY: Record<string, string> = {
          'Student Name': 'student_name', 'Student Full Name': 'student_name',
          'Student ID': 'student_id', 'Title (Mr./Mrs./Miss)': 'student_title',
          'Thai Tel. No.': 'thai_tel', 'Email': 'email', 'Email Address': 'email',
          'Education Level': 'education_level', 'Funding Type': 'funding_type',
          'Scholarship Name': 'scholarship_name', 'Program': 'program',
          'Destination City & Country': 'destination', 'Destination (City & Country)': 'destination',
          'Purpose of Leave': 'purpose', 'Purpose of Travel': 'purpose',
          'Duration (days/months)': 'duration_days', 'Leave Start Date': 'leave_start',
          'Leave End Date': 'leave_end', 'Leave Return Date': 'leave_end',
          'Visa Expiry': 'visa_expiry', 'Visa Expiry Date': 'visa_expiry',
          'Advisor Name': 'advisor_name', 'Current Date': 'date',
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
          return body.replace(/<span[^>]*>([^<]+)<\/span>/g, (match, text) => {
            const key = LABEL_TO_KEY[text.trim()];
            return key && baseVars[key] ? baseVars[key] : text;
          });
        }

        const printContent = templates.map(t => {
          const tplVars: string[] = (() => { try { return JSON.parse(t.variables ?? '[]'); } catch { return []; } })();
          const sigVars = tplVars.filter((v: string) => v.startsWith('{{sig_'));
          const studentFullName = [s?.titleEn, s?.firstNameEn, s?.lastNameEn].filter(Boolean).join(' ') || '—';
          const SIG_NAMES: Record<string, string> = { '{{sig_student}}': studentFullName, '{{sig_advisor}}': '', '{{sig_ir_staff}}': '', '{{sig_dean}}': '' };
          const SIG_ROLES: Record<string, string> = { '{{sig_student}}': 'Student', '{{sig_advisor}}': 'Advisor', '{{sig_ir_staff}}': 'IR Staff', '{{sig_dean}}': 'Dean' };
          const sigHtml = sigVars.length > 0
            ? `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:grid;grid-template-columns:repeat(${Math.min(sigVars.length, 4)},1fr);gap:24px">${sigVars.map((sv: string) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;height:40px;border-bottom:2px solid #1f2937;margin-top:16px"></div>${SIG_NAMES[sv] ? `<span style="font-size:11px;font-weight:600;text-align:center">${SIG_NAMES[sv]}</span>` : ''}<span style="font-size:11px;color:#6b7280">${SIG_ROLES[sv] ?? sv}</span><span style="font-size:10px;color:#9ca3af">Date ....../....../......</span></div>`).join('')}</div>`
            : '';
          return renderTemplate(t.body) + sigHtml;
        }).join('<hr style="margin:32px 0"/>');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 flex flex-col overflow-hidden max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <p className="font-semibold text-primary">Document Preview — {req.title}</p>
                <button onClick={() => setShowModal(false)} className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200">
                  <RiCloseLine size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-gray-100 px-6 py-6 flex flex-col gap-6">
                {templates.length === 0 && attachments.length === 0 && (
                  <div className="w-full h-48 bg-white rounded-xl flex items-center justify-center text-gray-400 text-sm">
                    No document template or attachments for this request type.
                  </div>
                )}
                {templates.map((tpl) => {
                  const tplVars: string[] = (() => { try { return JSON.parse(tpl.variables ?? '[]'); } catch { return []; } })();
                  const sigVars = tplVars.filter((v: string) => v.startsWith('{{sig_'));
                  const studentFullName = [s?.titleEn, s?.firstNameEn, s?.lastNameEn].filter(Boolean).join(' ') || '—';
                  const SIG_NAMES: Record<string, string> = { '{{sig_student}}': studentFullName, '{{sig_advisor}}': '', '{{sig_ir_staff}}': '', '{{sig_dean}}': '' };
                  const SIG_ROLES: Record<string, string> = { '{{sig_student}}': 'Student', '{{sig_advisor}}': 'Advisor', '{{sig_ir_staff}}': 'IR Staff', '{{sig_dean}}': 'Dean' };
                  return (
                    <div key={tpl.id} className="bg-white shadow-md mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '25mm 20mm', fontFamily: "'Times New Roman', serif", fontSize: '14px', color: '#222', lineHeight: '2' }}>
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
                })}
                {attachments.length > 0 && (
                  <div className="bg-white shadow-md mx-auto p-6 flex flex-col gap-2" style={{ width: '210mm' }}>
                    <p className="text-xs font-semibold text-primary/60 uppercase tracking-wide">Attachments</p>
                    {attachments.map((url, i) => {
                      const isImage = /\.(png|jpe?g|gif|webp)$/i.test(url);
                      return isImage
                        ? <img key={i} src={url} alt={`Attachment ${i + 1}`} className="max-w-full" />
                        : <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary underline"><RiFileTextLine size={14} /> Attachment {i + 1}</a>;
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                <Button variant="ghost" label="Close" onClick={() => setShowModal(false)} />
                <Button variant="primary" label="Print" icon={RiPrinterLine} onClick={() => {
                  const w = window.open('', '_blank');
                  if (!w) return;
                  const origin = window.location.origin;
                  const html = printContent.replace(/src="\/kkulogo2\.png"/g, `src="${origin}/kkulogo2.png"`);
                  w.document.write(`<!DOCTYPE html><html><head><title>Document Preview</title><style>body{font-family:'Times New Roman',serif;margin:25mm 20mm;font-size:14px;color:#222;line-height:2;}@media print{@page{margin:0;}body{margin:25mm 20mm;}}hr{margin:32px 0;border:none;border-top:1px solid #e5e7eb}</style></head><body>${html}</body></html>`);
                  w.document.close();
                  w.print();
                }} />
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
