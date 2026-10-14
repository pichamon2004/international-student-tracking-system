'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { RiArrowLeftLine, RiDeleteBinLine, RiAddLine, RiCloseLine, RiPencilLine, RiEyeLine, RiFileTextLine } from 'react-icons/ri';
import { studentMeApi, academicDocumentApi, changeRequestApi, academicDocPages, type ApiAcademicDocument, type ApiChangeRequest } from '@/lib/api';
import PendingBanner from '@/components/PendingBanner';
import { SectionTitle, fmtDate } from '@/components/profile/ProfileUI';
import toast from 'react-hot-toast';

// Above this many documents the gallery switches to a compact 2-column list
const GALLERY_MAX = 4;

const isPdf = (url: string) => /\.pdf($|\?)/i.test(url);

function Thumb({ url, className }: { url: string | null; className: string }) {
  if (url && !isPdf(url)) {
    return <img src={url} alt="Document" className={`${className} object-cover`} />;
  }
  return (
    <div className={`${className} flex flex-col items-center justify-center gap-1.5 text-primary/60`}>
      <RiFileTextLine size={24} />
      <span className="text-[10px] font-semibold text-gray-500">{url ? 'PDF' : 'No file'}</span>
    </div>
  );
}

function ConfirmDelete({ doc, busy, onConfirm, onCancel }: {
  doc: ApiAcademicDocument; busy: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-800">Delete this document?</h2>
        <p className="text-sm text-gray-500">
          <strong className="text-gray-700">{doc.docType}</strong> from {doc.institution} will be deleted. This can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
          <button onClick={onConfirm} disabled={busy}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50">
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AcademicPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<ApiAcademicDocument[]>([]);
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<ApiAcademicDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingChange, setPendingChange] = useState<ApiChangeRequest | null>(null);
  // Every page of the document being viewed (images shown inline, PDFs embedded)
  const [previewPages, setPreviewPages] = useState<string[] | null>(null);

  const loadPending = (sid: number) =>
    changeRequestApi.getPendingForEntity('ACADEMIC_DOCUMENT', null, sid).then(r => setPendingChange(r.data.data)).catch(() => {});

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      setDocs(s.academicDocuments ?? []);
      loadPending(s.id);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function confirmDelete() {
    if (!studentNumId || !toDelete) return;
    setDeleting(true);
    try {
      const res = await academicDocumentApi.delete(studentNumId, toDelete.id);
      // Registered students' deletions go to staff for approval (202)
      if (res.status === 202) {
        toast.success('Deletion submitted — awaiting staff approval');
        loadPending(studentNumId);
      } else {
        setDocs(prev => prev.filter(d => d.id !== toDelete.id));
        toast.success('Document deleted');
      }
      setToDelete(null);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  function view(doc: ApiAcademicDocument) {
    const pages = academicDocPages(doc);
    if (pages.length === 0) return;
    // A single PDF opens in its own tab; anything else uses the page viewer
    if (pages.length === 1 && isPdf(pages[0])) window.open(pages[0], '_blank', 'noopener');
    else setPreviewPages(pages);
  }

  const pageCount = (doc: ApiAcademicDocument) => academicDocPages(doc).length;

  const addDoc = () => router.push('/student/profile/updateacademic');
  const editDoc = (doc: ApiAcademicDocument) => router.push(`/student/profile/updateacademic?id=${doc.id}`);
  const compact = docs.length > GALLERY_MAX;

  const actionBtns = (doc: ApiAcademicDocument, viewCls: string) => (
    <>
      <button onClick={() => view(doc)} disabled={!doc.fileUrl}
        className={`${viewCls} inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition disabled:opacity-40 disabled:cursor-not-allowed`}>
        <RiEyeLine size={14} /> View
      </button>
      <button onClick={() => editDoc(doc)} title="Edit"
        className="w-8 h-8 shrink-0 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 hover:text-primary transition">
        <RiPencilLine size={14} />
      </button>
      <button onClick={() => setToDelete(doc)} title="Delete"
        className="w-8 h-8 shrink-0 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition">
        <RiDeleteBinLine size={14} />
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* The card keeps its size; only the content below the header scrolls */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F3F7FD] text-primary hover:bg-primary hover:text-white transition"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-primary flex-1">Academic Documents</h1>
          <button
            onClick={addDoc}
            className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            <RiAddLine size={16} /> Add document
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 -mr-2 pr-2">
          {pendingChange && (
            <PendingBanner
              pending={pendingChange}
              fieldLabels={{ docType: 'Document Type', institution: 'Institution', issueDate: 'Issue Date' }}
              onCancel={() => setPendingChange(null)}
            />
          )}

          <div className="rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <SectionTitle title="My documents">
                {!loading && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#DEEBFF] text-primary text-[11px] font-semibold">
                    {docs.length} file{docs.length === 1 ? '' : 's'}
                  </span>
                )}
              </SectionTitle>
              <p className="text-xs text-gray-500">Transcripts, certificates and other academic records</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl" />)}
              </div>
            ) : docs.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-1">
                <p className="text-sm font-semibold text-gray-700">No documents yet</p>
                <p className="text-xs text-gray-500">Use “Add document” above to upload your transcript, certificates and more.</p>
              </div>
            ) : compact ? (
              /* Many documents — compact rows, 2 per line */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 min-w-0">
                    <button type="button" onClick={() => view(doc)} disabled={!doc.fileUrl}
                      className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[#F3F7FD] disabled:cursor-default">
                      <Thumb url={doc.fileUrl} className="w-full h-full" />
                    </button>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-full bg-[#DEEBFF] text-primary text-[10px] font-semibold max-w-full truncate">{doc.docType}</span>
                        {pageCount(doc) > 1 && <span className="text-[10px] text-gray-500 shrink-0">{pageCount(doc)} pages</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{doc.institution}</p>
                      <p className="text-[11px] text-gray-500">Issued {fmtDate(doc.issueDate)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {actionBtns(doc, 'px-3')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Few documents — gallery cards, 4 per line */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {docs.map(doc => (
                  <div key={doc.id} className="rounded-2xl border border-gray-100 overflow-hidden flex flex-col min-w-0">
                    <button type="button" onClick={() => view(doc)} disabled={!doc.fileUrl}
                      className="aspect-[4/3] bg-[#F3F7FD] overflow-hidden disabled:cursor-default">
                      <Thumb url={doc.fileUrl} className="w-full h-full" />
                    </button>
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-full bg-[#DEEBFF] text-primary text-[10px] font-semibold max-w-full truncate">{doc.docType}</span>
                        {pageCount(doc) > 1 && <span className="text-[10px] text-gray-500 shrink-0">{pageCount(doc)} pages</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{doc.institution}</p>
                      <p className="text-[11px] text-gray-500">Issued {fmtDate(doc.issueDate)}</p>
                      <div className="flex items-center gap-1.5 mt-auto pt-2">
                        {actionBtns(doc, 'flex-1')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toDelete && (
        <ConfirmDelete doc={toDelete} busy={deleting} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
      )}

      {previewPages && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center bg-black/70 px-4 py-6 overflow-y-auto"
          onClick={() => setPreviewPages(null)}
        >
          <button
            onClick={() => setPreviewPages(null)}
            className="fixed top-5 right-5 z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            <RiCloseLine size={20} />
          </button>
          <div className="flex flex-col items-center gap-4 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            {previewPages.map((url, i) => (
              <div key={url + i} className="w-full flex flex-col gap-1.5">
                {previewPages.length > 1 && <span className="text-xs font-semibold text-white/80">Page {i + 1} of {previewPages.length}</span>}
                {isPdf(url) ? (
                  <iframe src={url} title={`Page ${i + 1}`} className="w-full h-[80vh] rounded-xl bg-white" />
                ) : (
                  <img src={url} alt={`Page ${i + 1}`} className="w-full max-h-[85vh] object-contain rounded-xl bg-white" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
