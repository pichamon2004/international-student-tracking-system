'use client';

import { useState, useEffect, useRef } from 'react';
import { RiUploadCloud2Line, RiPencilLine, RiCloseLine, RiCheckLine, RiMailLine, RiPhoneLine, RiGroupLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { advisorApi, type ApiAdvisor } from '@/lib/api';
import DateSelect from '@/components/ui/DateSelect';
import CustomSelect from '@/components/ui/CustomSelect';
import { strOptions } from '@/components/profile/FormUI';
import { InfoTile, SectionCard, SectionTitle, fmtDate, expiryStatus, EXPIRY_STYLE } from '@/components/profile/ProfileUI';
import { advisorFullName } from '@/lib/names';

// Same choices as the staff advisor edit page
const TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Asst. Prof.', 'Assoc. Prof.', 'Prof.'];

type FormState = {
  titleEn: string;
  firstNameEn: string;
  middleNameEn: string;
  lastNameEn: string;
  phone: string;
  nationality: string;
  workPermitNumber: string;
  workPermitIssue: string;
  workPermitExpiry: string;
};

const toForm = (a: ApiAdvisor): FormState => ({
  titleEn:          a.titleEn ?? '',
  firstNameEn:      a.firstNameEn ?? '',
  middleNameEn:     a.middleNameEn ?? '',
  lastNameEn:       a.lastNameEn ?? '',
  phone:            a.phone ?? '',
  nationality:      a.nationality ?? '',
  workPermitNumber: a.workPermitNumber ?? '',
  workPermitIssue:  a.workPermitIssue ? a.workPermitIssue.slice(0, 10) : '',
  workPermitExpiry: a.workPermitExpiry ? a.workPermitExpiry.slice(0, 10) : '',
});

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white outline-none focus:border-primary transition-colors';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-medium text-primary/70">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

export default function AdvisorProfilePage() {
  const [advisor, setAdvisor] = useState<ApiAdvisor | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    advisorApi.getMe()
      .then(res => { setAdvisor(res.data.data); setForm(toForm(res.data.data)); })
      .catch(() => toast.error('Failed to load your profile'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof FormState) => (v: string) => setForm(prev => (prev ? { ...prev, [key]: v } : prev));
  const setText = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => set(key)(e.target.value);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await advisorApi.uploadPhoto(file);
      setAdvisor(prev => (prev ? { ...prev, photoUrl: res.data.data.url } : prev));
      toast.success('Photo updated');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!form) return;
    if (!form.firstNameEn.trim() || !form.lastNameEn.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (form.workPermitIssue && form.workPermitExpiry && form.workPermitExpiry < form.workPermitIssue) {
      toast.error('Work permit expiry must be after the issue date');
      return;
    }
    setSaving(true);
    try {
      const res = await advisorApi.update({
        titleEn:          form.titleEn.trim() || undefined,
        firstNameEn:      form.firstNameEn.trim(),
        middleNameEn:     form.middleNameEn.trim(),
        lastNameEn:       form.lastNameEn.trim(),
        phone:            form.phone.trim() || undefined,
        nationality:      form.nationality.trim() || undefined,
        workPermitNumber: form.workPermitNumber.trim() || undefined,
        workPermitIssue:  form.workPermitIssue || undefined,
        workPermitExpiry: form.workPermitExpiry || undefined,
      });
      setAdvisor(res.data.data);
      setForm(toForm(res.data.data));
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !advisor || !form) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-6 animate-pulse flex flex-col gap-4">
        <div className="h-8 bg-gray-100 rounded w-1/4" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const fullName = advisorFullName(advisor) || '—';
  const initials = [advisor.firstNameEn, advisor.lastNameEn].filter(Boolean).map(w => w![0]).join('').toUpperCase() || '?';
  const permitStatus = advisor.workPermitExpiry ? expiryStatus(advisor.workPermitExpiry) : null;
  const studentCount = advisor.students?.length ?? 0;

  return (
    <div className="bg-white w-full flex-1 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 min-h-0">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-primary flex-1">My Profile</h1>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setForm(toForm(advisor)); setEditing(false); }}
              disabled={saving}
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition disabled:opacity-40"
            >
              <RiCloseLine size={16} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
            >
              <RiCheckLine size={16} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary/90 transition"
          >
            <RiPencilLine size={15} /> Edit
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 -mr-2 pr-2">
        {/* Identity */}
        <SectionCard className="sm:flex-row sm:items-center gap-5">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-primary flex items-center justify-center text-white text-3xl font-bold shrink-0">
            {advisor.photoUrl
              ? <img src={advisor.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              : initials}
          </div>
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-semibold text-gray-800">{fullName}</p>
              {advisor.position && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700">{advisor.position}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5"><RiMailLine size={15} className="text-primary/60" /> {advisor.email ?? '—'}</span>
              {advisor.phone && <span className="inline-flex items-center gap-1.5"><RiPhoneLine size={15} className="text-primary/60" /> {advisor.phone}</span>}
              <span className="inline-flex items-center gap-1.5"><RiGroupLine size={15} className="text-primary/60" /> {studentCount} student{studentCount === 1 ? '' : 's'} supervised</span>
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/40 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition disabled:opacity-40"
              >
                <RiUploadCloud2Line size={14} /> {uploadingPhoto ? 'Uploading…' : 'Upload new photo'}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Personal information */}
        <SectionCard>
          <SectionTitle title="Personal information" />
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Title"><CustomSelect value={form.titleEn} onChange={set('titleEn')} options={strOptions(TITLES, form.titleEn)} placeholder="— Select —" wrapOptions /></Field>
              <Field label="First name"><input value={form.firstNameEn} onChange={setText('firstNameEn')} className={inputCls} /></Field>
              <Field label="Middle name"><input value={form.middleNameEn} onChange={setText('middleNameEn')} placeholder="(optional)" className={inputCls} /></Field>
              <Field label="Last name"><input value={form.lastNameEn} onChange={setText('lastNameEn')} className={inputCls} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={setText('phone')} className={inputCls} /></Field>
              <Field label="Nationality"><input value={form.nationality} onChange={setText('nationality')} className={inputCls} /></Field>
              <Field label="Email" hint="Your sign-in email — contact staff to change it">
                <input value={advisor.email ?? ''} disabled className={`${inputCls} bg-gray-50 text-gray-400`} />
              </Field>
              <Field label="Administrative position" hint="Set by staff">
                <input value={advisor.position ?? ''} disabled className={`${inputCls} bg-gray-50 text-gray-400`} />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <InfoTile label="Title" value={advisor.titleEn} />
              <InfoTile label="First name" value={advisor.firstNameEn} />
              <InfoTile label="Middle name" value={advisor.middleNameEn} />
              <InfoTile label="Last name" value={advisor.lastNameEn} />
              <InfoTile label="Phone" value={advisor.phone} />
              <InfoTile label="Nationality" value={advisor.nationality} />
              <InfoTile label="Email" value={advisor.email} />
              <InfoTile label="Administrative position" value={advisor.position} />
              <InfoTile label="Students supervised" value={String(studentCount)} />
            </div>
          )}
        </SectionCard>

        {/* Work permit */}
        <SectionCard>
          <SectionTitle title="Work permit">
            {!editing && permitStatus && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${EXPIRY_STYLE[permitStatus].badge}`}>{EXPIRY_STYLE[permitStatus].label}</span>
            )}
          </SectionTitle>
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Work permit no."><input value={form.workPermitNumber} onChange={setText('workPermitNumber')} className={inputCls} /></Field>
              <Field label="Date of issue"><DateSelect value={form.workPermitIssue} onChange={set('workPermitIssue')} /></Field>
              <Field label="Date of expiry"><DateSelect value={form.workPermitExpiry} onChange={set('workPermitExpiry')} /></Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <InfoTile label="Work permit no." value={advisor.workPermitNumber} />
              <InfoTile label="Date of issue" value={fmtDate(advisor.workPermitIssue)} />
              <InfoTile label="Date of expiry" value={fmtDate(advisor.workPermitExpiry)} tone={permitStatus === 'expired' ? 'danger' : 'default'} />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
