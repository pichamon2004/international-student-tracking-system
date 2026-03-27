'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiDeleteBinLine, RiAddLine } from 'react-icons/ri';
import { studentMeApi, academicDocumentApi, type ApiAcademicDocument } from '@/lib/api';
import toast from 'react-hot-toast';

const labelCls = 'text-xs font-medium text-primary/70';
const valueCls = 'text-sm font-medium text-gray-800';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelCls}>{label}</span>
      <span className={valueCls}>{value || '—'}</span>
    </div>
  );
}

function fmtDate(val: string) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AcademicPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<ApiAcademicDocument[]>([]);
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      setDocs(s.academicDocuments ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(docId: number) {
    if (!studentNumId) return;
    setDeleting(docId);
    try {
      await academicDocumentApi.delete(studentNumId, docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 flex-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-primary flex-1">Academic Document</h1>
          <button
            onClick={() => router.push('/student/profile/updateacademic')}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            <RiAddLine size={16} /> Add
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
            No academic documents yet.{' '}
            <button onClick={() => router.push('/student/profile/updateacademic')} className="text-primary font-medium underline">
              Add one
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {docs.map(doc => (
              <div key={doc.id} className="border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-gray-700">Document Details</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/student/profile/updateacademic?id=${doc.id}`)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-50"
                    >
                      <RiDeleteBinLine size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InfoRow label="Document Type" value={doc.docType} />
                  <InfoRow label="Institution" value={doc.institution} />
                  <InfoRow label="Issue Date" value={fmtDate(doc.issueDate)} />
                </div>

                {doc.fileUrl && (
                  <>
                    <hr className="border-gray-100" />
                    <div className="flex flex-col gap-3">
                      <p className="text-sm font-semibold text-gray-700">Document Image</p>
                      <img src={doc.fileUrl} alt="Document" className="w-40 h-52 object-cover rounded-xl border border-gray-200" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
