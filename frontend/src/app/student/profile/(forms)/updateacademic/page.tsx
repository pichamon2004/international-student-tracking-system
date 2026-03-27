'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload, FiX } from 'react-icons/fi';
import { studentMeApi, academicDocumentApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const labelCls = 'text-xs font-medium text-primary mb-1';

const DOC_TYPES = ['Transcript', 'Degree Certificate', 'Enrollment Certificate', 'Other'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function AcademicForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const fileRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({ docType: '', institution: '', issueDate: '' });
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      if (isEdit && id) {
        const doc = (s.academicDocuments ?? []).find((d: { id: number }) => d.id === Number(id));
        if (doc) {
          setForm({
            docType:     doc.docType ?? '',
            institution: doc.institution ?? '',
            issueDate:   doc.issueDate ? doc.issueDate.slice(0, 10) : '',
          });
          if (doc.fileUrl) setPreviews([doc.fileUrl]);
        }
      }
    }).catch(console.error);
  }, [isEdit, id]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...urls]);
  }

  function removeImage(i: number) {
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.docType || !form.institution || !form.issueDate) {
      toast.error('Please fill in Document Type, Institution, and Issue Date');
      return;
    }
    setSaving(true);
    try {
      // Upload first selected file to R2 if a new file was picked
      let fileUrl: string | undefined;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const { default: api } = await import('@/lib/api');
        const formData = new FormData();
        formData.append('image', file);
        const uploadRes = await api.post(`/students/${studentNumId}/academic-documents/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = uploadRes.data.data.url;
      }

      if (isEdit && id) {
        await academicDocumentApi.update(studentNumId, Number(id), {
          docType:     form.docType,
          institution: form.institution,
          issueDate:   form.issueDate,
          ...(fileUrl !== undefined && { fileUrl }),
        });
      } else {
        await academicDocumentApi.create(studentNumId, {
          docType:     form.docType,
          institution: form.institution,
          issueDate:   form.issueDate,
          ...(fileUrl !== undefined && { fileUrl }),
        });
      }
      setProgressField('academicDocumentCompleted', true);
      toast.success(isEdit ? 'Academic document updated' : 'Academic document added');
      router.back();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 flex-1">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-primary">
          {isEdit ? 'Edit Academic Document' : 'Add Academic Document'}
        </h1>
      </div>

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Document Type *">
            <CustomSelect value={form.docType} onChange={(val) => setForm(p => ({ ...p, docType: val }))} options={DOC_TYPES} placeholder="Select Type" />
          </Field>
          <Field label="Institution *">
            <input value={form.institution} onChange={set('institution')} placeholder="e.g. Khon Kaen University" className={inputCls} />
          </Field>
          <Field label="Issue Date *">
            <DateSelect value={form.issueDate} onChange={(v) => setForm(p => ({ ...p, issueDate: v }))} />
          </Field>
        </div>

        <hr className="border-gray-100" />

        <div className="flex flex-col gap-2">
          <label className={labelCls}>Document Images</label>
          <div className="flex flex-wrap gap-3">
            {previews.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt={`Doc ${i + 1}`} className="w-40 h-52 object-cover rounded-xl border border-gray-200" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <FiX size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-96 h-60 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition text-sm"
            >
              <FiUpload size={24} />
              Upload Document Image
            </button>
            <input ref={fileRef} type="file" accept="image/*,.pdf" multiple onChange={handleFiles} className="hidden" />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          disabled={saving}
          onClick={handleSave}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function AcademicPage() {
  return (
    <Suspense>
      <AcademicForm />
    </Suspense>
  );
}
