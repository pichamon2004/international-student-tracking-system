'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { RiArrowLeftLine, RiUser3Line, RiFileTextLine, RiCalendarLine, RiUserStarLine, RiDownloadLine, RiFilePdfLine, RiFileImageLine, RiAttachmentLine, RiCloseLine, RiCheckLine } from 'react-icons/ri';

type Status = 'Pending' | 'Approved' | 'Rejected';

interface RequestLog {
  date: string;
  detail: string;
}

interface Attachment {
  name: string;
  type: 'pdf' | 'image';
  size: string;
}

interface RequestDetail {
  id: string;
  name: string;
  documentType: string;
  startDate: string;
  advisor: string;
  status: Status;
  attachments: Attachment[];
  logs: RequestLog[];
}

const mockDetails: Record<string, RequestDetail> = {
  '1': {
    id: 'Req001', name: 'Joanna Sofia', documentType: 'Travel Letter',
    startDate: '01/01/1001', advisor: 'Asst. Prof. Pusadee Seresangtakul', status: 'Pending',
    attachments: [
      { name: 'travel_request_form.pdf', type: 'pdf',   size: '245 KB' },
      { name: 'passport_copy.jpg',       type: 'image', size: '1.2 MB' },
    ],
    logs: [
      { date: '01/01/1001', detail: 'Pending'            },
      { date: '01/01/1001', detail: 'Create New Request' },
    ],
  },
  '2': {
    id: 'Req002', name: 'Liu Chen', documentType: 'Visa Extension',
    startDate: '02/03/2025', advisor: 'Asst. Prof. Pusadee Seresangtakul', status: 'Approved',
    attachments: [
      { name: 'visa_extension_form.pdf', type: 'pdf',   size: '318 KB' },
      { name: 'current_visa.jpg',        type: 'image', size: '890 KB' },
      { name: 'enrollment_cert.pdf',     type: 'pdf',   size: '156 KB' },
    ],
    logs: [
      { date: '05/03/2025', detail: 'Staff Approved'     },
      { date: '03/03/2025', detail: 'Advisor Approved'   },
      { date: '02/03/2025', detail: 'Create New Request' },
    ],
  },
  '3': {
    id: 'Req003', name: 'Aung Kyaw', documentType: 'Enrollment Letter',
    startDate: '05/03/2025', advisor: 'Asst. Prof. Pusadee Seresangtakul', status: 'Rejected',
    attachments: [
      { name: 'enrollment_request.pdf',  type: 'pdf',   size: '201 KB' },
    ],
    logs: [
      { date: '07/03/2025', detail: 'Request Rejected'   },
      { date: '05/03/2025', detail: 'Create New Request' },
    ],
  },
  '4': {
    id: 'Req004', name: 'Maria Santos', documentType: 'Travel Letter',
    startDate: '10/03/2025', advisor: 'Asst. Prof. Pusadee Seresangtakul', status: 'Pending',
    attachments: [
      { name: 'travel_letter_form.pdf',  type: 'pdf',   size: '178 KB' },
      { name: 'passport_scan.jpg',       type: 'image', size: '2.1 MB' },
    ],
    logs: [
      { date: '10/03/2025', detail: 'Create New Request' },
    ],
  },
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const req = mockDetails[id];

  const [localStatus, setLocalStatus] = useState<Status>(req?.status ?? 'Pending');
  const [comment, setComment] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showRejectError, setShowRejectError] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleApprove = () => {
    setLocalStatus('Approved');
    setActionDone(true);
  };

  const handleReject = () => {
    if (!comment.trim()) {
      setShowRejectError(true);
      return;
    }
    setShowRejectError(false);
    setLocalStatus('Rejected');
    setActionDone(true);
  };

  if (!req) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-8 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Request not found</p>
        <Button variant="ghost" label="Back" onClick={() => router.back()} />
      </div>
    );
  }

  const isPending = localStatus === 'Pending';

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
        <h1 className="text-2xl font-semibold text-primary">{req.id}</h1>
        <StatusBadge status={localStatus} />
      </div>

      {/* Success Banner */}
      {actionDone && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${localStatus === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          <RiCheckLine size={16} />
          {localStatus === 'Approved' ? 'คำร้องได้รับการอนุมัติเรียบร้อยแล้ว' : 'คำร้องถูกปฏิเสธเรียบร้อยแล้ว'}
        </div>
      )}

      {/* Main layout: left info + right history */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {/* LEFT: Request Info + Attachments */}
        <div className="flex flex-col gap-4 lg:w-72 shrink-0">

          {/* Info Card */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Request Info</p>
            {[
              { icon: RiUser3Line,    label: 'Student',       value: req.name },
              { icon: RiFileTextLine, label: 'Document Type', value: req.documentType },
              { icon: RiCalendarLine, label: 'Submitted',     value: req.startDate },
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
          </div>

          {/* Attachments Card */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Attachments</p>
            {req.attachments.map((file) => (
              <div key={file.name} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
                {file.type === 'pdf'
                  ? <RiFilePdfLine   size={18} className="text-red-400 shrink-0" />
                  : <RiFileImageLine size={18} className="text-blue-400 shrink-0" />
                }
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-medium text-primary truncate">{file.name}</span>
                  <span className="text-xs text-gray-400">{file.size}</span>
                </div>
                <button
                  onClick={() => {}}
                  className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary hover:text-white text-gray-400 transition-all duration-200"
                >
                  <RiDownloadLine size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Activity History + Advisor Response */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <p className="text-sm font-semibold text-primary/50 uppercase tracking-wide">Activity History</p>
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left   py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left   py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Detail</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {req.logs.map((log, i) => {
                  const isInProgress = i === 0 && isPending;
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{log.date}</td>
                      <td className="py-3 px-4 text-primary font-medium">{log.detail}</td>
                      <td className="py-3 px-4 text-center">
                        {isInProgress ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Finished
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
              {/* Attach */}
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
                          <RiFilePdfLine size={13} className="text-primary/50 shrink-0" />
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

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <Button variant="danger"  label="Reject"  disabled={!isPending} onClick={handleReject} />
                <Button variant="success" label="Approve" disabled={!isPending} onClick={handleApprove} />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
