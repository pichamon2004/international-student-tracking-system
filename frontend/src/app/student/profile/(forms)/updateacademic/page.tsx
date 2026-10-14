'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine, RiUploadLine, RiDeleteBinLine, RiFileTextLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import { studentMeApi, academicDocumentApi, academicDocPages } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';
import { Field, Section, inputCls } from '@/components/profile/FormUI';

const DOC_TYPES = ['Transcript', 'Degree Certificate', 'Enrollment Certificate', 'Certificate', 'Language Test Result', 'Other'];

const MAX_FILE_MB = 10; // backend `upload` middleware limit (upload.middleware.ts)

// One page of the document: either already uploaded (url) or newly picked (file)
type Page = { key: string; url: string; file?: File; name: string; size?: number };

const isPdf = (p: Page) => p.file ? p.file.type === 'application/pdf' : /\.pdf($|\?)/i.test(p.url);
const fileNameFromUrl = (url: string) => decodeURIComponent(url.split('?')[0].split('/').pop() || 'page');
const fmtSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function AcademicForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const fileRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ docType: '', institution: '', issueDate: '' });
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      if (isEdit && id) {
        const doc = (s.academicDocuments ?? []).find(d => d.id === Number(id));
        if (doc) {
          setForm({
            docType:     doc.docType ?? '',
            institution: doc.institution ?? '',
            issueDate:   doc.issueDate ? doc.issueDate.slice(0, 10) : '',
          });
          setPages(academicDocPages(doc).map((url, i) => ({ key: `saved-${i}`, url, name: fileNameFromUrl(url) })));
        }
      }
    }).catch(console.error);
  }, [isEdit, id]);

  const setVal = (key: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [key]: v }));

  function addFiles(list: FileList | File[]) {
    const accepted: Page[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error(`${file.name}: only JPG, PNG or PDF files`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_FILE_MB} MB`);
        continue;
      }
      accepted.push({ key: `new-${Date.now()}-${Math.random()}`, url: URL.createObjectURL(file), file, name: file.name, size: file.size });
    }
    if (accepted.length) setPages(prev => [...prev, ...accepted]);
  }

  const removePage = (i: number) => setPages(prev => prev.filter((_, idx) => idx !== i));
  const movePage = (i: number, dir: -1 | 1) => setPages(prev => {
    const j = i + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.docType || !form.institution.trim() || !form.issueDate) {
      toast.error('Please fill in Document type, Institution, and Issue date');
      return;
    }
    if (pages.length === 0) {
      toast.error('Please upload at least one page of the document');
      return;
    }
    setSaving(true);
    try {
      const { default: api } = await import('@/lib/api');
      // Upload new pages; Promise.all keeps the order, so urls line up with `pages`
      const urls = await Promise.all(pages.map(async p => {
        if (!p.file) return p.url;
        const fd = new FormData();
        fd.append('image', p.file);
        const res = await api.post(`/students/${studentNumId}/academic-documents/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.data.url as string;
      }));

      const payload = {
        docType:     form.docType,
        institution: form.institution.trim(),
        issueDate:   form.issueDate,
        fileUrl:     urls[0],
        pageUrls:    JSON.stringify(urls),
      };

      const res = isEdit && id
        ? await academicDocumentApi.update(studentNumId, Number(id), payload)
        : await academicDocumentApi.create(studentNumId, payload);

      if (res.status === 202) {
        toast.success('Change submitted — awaiting staff approval');
        router.back();
        return;
      }
      setProgressField('academicDocumentCompleted', true);
      toast.success(isEdit ? 'Document updated' : 'Document added');
      router.back();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* The card keeps its size; only the sections scroll */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-start gap-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F3F7FD] text-primary hover:bg-primary hover:text-white transition shrink-0"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <div className="flex flex-col flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-primary">{isEdit ? 'Edit document' : 'Add document'}</h1>
            <p className="text-xs text-gray-500">Academic documents</p>
          </div>
          <p className="text-xs text-gray-500 pt-2 shrink-0"><span className="text-red-500">*</span> Required field</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 -mr-2 pr-2">
          {/* 1 · Document details */}
          <Section n={1} title="Document details" subtitle="Enter them as they appear on the document.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Document type" required>
                <CustomSelect
                  value={form.docType}
                  onChange={setVal('docType')}
                  // keep older values selectable
                  options={form.docType && !DOC_TYPES.includes(form.docType) ? [...DOC_TYPES, form.docType] : DOC_TYPES}
                  placeholder="Select type"
                />
              </Field>
              <Field label="Institution" required hint="The school, university or test centre that issued it">
                <input value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))}
                  placeholder="e.g. Khon Kaen University" className={inputCls} />
              </Field>
              <Field label="Issue date" required>
                <DateSelect value={form.issueDate} onChange={setVal('issueDate')} />
              </Field>
            </div>
          </Section>

          {/* 2 · Document images */}
          <Section n={2} title="Document images" required
            subtitle={`Upload every page, in order. JPG, PNG or PDF, up to ${MAX_FILE_MB} MB each.`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {pages.map((p, i) => (
                <div key={p.key} className="flex flex-col gap-2 min-w-0">
                  <div className="relative aspect-[3/4] rounded-xl border border-gray-200 bg-[#F3F7FD] overflow-hidden">
                    <span className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold">Page {i + 1}</span>
                    {isPdf(p) ? (
                      <a href={p.url} target="_blank" rel="noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-primary/60">
                        <RiFileTextLine size={28} />
                        <span className="text-[10px] font-semibold text-gray-500">PDF</span>
                      </a>
                    ) : (
                      <img src={p.url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    )}
                    {pages.length > 1 && (
                      <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                        <button type="button" onClick={() => movePage(i, -1)} disabled={i === 0} title="Move earlier"
                          className="w-6 h-6 rounded-md bg-white/90 text-gray-600 flex items-center justify-center shadow-sm hover:text-primary disabled:opacity-30">
                          <RiArrowLeftSLine size={15} />
                        </button>
                        <button type="button" onClick={() => movePage(i, 1)} disabled={i === pages.length - 1} title="Move later"
                          className="w-6 h-6 rounded-md bg-white/90 text-gray-600 flex items-center justify-center shadow-sm hover:text-primary disabled:opacity-30">
                          <RiArrowRightSLine size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-gray-700 truncate" title={p.name}>{p.name}</span>
                      {p.size !== undefined && <span className="text-[10px] text-gray-400">{fmtSize(p.size)}</span>}
                    </div>
                    <button type="button" onClick={() => removePage(i)} title={`Remove page ${i + 1}`}
                      className="w-8 h-8 shrink-0 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition">
                      <RiDeleteBinLine size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add page */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                className={`aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-center px-3 transition ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-primary/25 bg-[#F3F7FD] hover:border-primary/50'
                }`}
              >
                <span className="w-9 h-9 rounded-lg bg-white text-primary flex items-center justify-center shadow-sm">
                  <RiUploadLine size={18} />
                </span>
                <span className="text-sm font-semibold text-primary">{pages.length ? 'Add page' : 'Add pages'}</span>
                <span className="text-[11px] text-gray-500">Click or drag files here</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*,.pdf" multiple className="hidden"
                onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save document'}
          </button>
        </div>
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
