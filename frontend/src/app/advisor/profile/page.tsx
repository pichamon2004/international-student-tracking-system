'use client';

import { useState, useEffect, useRef } from 'react';
import { FiUpload } from "react-icons/fi";
import { MdModeEditOutline } from "react-icons/md";
import { advisorApi, type ApiAdvisor } from '@/lib/api';
import toast from 'react-hot-toast';
import DateSelect from '@/components/ui/DateSelect';

function ViewField({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-primary/50">{label}</span>
            <span className="text-sm font-semibold text-primary">{value || '—'}</span>
        </div>
    );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-primary">{label}</label>
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary"
            />
        </div>
    );
}

type FormState = {
    prefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    telNo: string;
    email: string;
    nationality: string;
    workPermitIssue: string;
    workPermitExpiry: string;
    workPermitNo: string;
};

function mapAdvisorToForm(a: ApiAdvisor): FormState {
    return {
        prefix:          a.titleEn ?? '',
        firstName:       a.firstNameEn ?? '',
        middleName:      '',
        lastName:        a.lastNameEn ?? '',
        telNo:           a.phone ?? '',
        email:           a.email ?? '',
        nationality:     a.nationality ?? '',
        workPermitIssue:  a.workPermitIssue ? a.workPermitIssue.slice(0, 10) : '',
        workPermitExpiry: a.workPermitExpiry ? a.workPermitExpiry.slice(0, 10) : '',
        workPermitNo:     a.workPermitNumber ?? '',
    };
}

function AdvisorProfilePage() {
    const [editing, setEditing] = useState(false);
    const [advisor, setAdvisor] = useState<ApiAdvisor | null>(null);
    const [form, setForm] = useState<FormState>({
        prefix: '', firstName: '', middleName: '', lastName: '',
        telNo: '', email: '', nationality: '',
        workPermitIssue: '', workPermitExpiry: '', workPermitNo: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        advisorApi.getMe()
            .then(res => {
                const data = res.data.data;
                setAdvisor(data);
                setForm(mapAdvisorToForm(data));
                setPhotoUrl(data.photoUrl ?? null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const res = await advisorApi.uploadPhoto(file);
            setPhotoUrl(res.data.data.url);
            toast.success('Photo updated');
        } catch {
            toast.error('Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    function set(key: keyof FormState) {
        return (v: string) => setForm(prev => ({ ...prev, [key]: v }));
    }

    async function handleSave() {
        setSaving(true);
        try {
            const res = await advisorApi.update({
                titleEn:           form.prefix || undefined,
                firstNameEn:       form.firstName || undefined,
                lastNameEn:        form.lastName || undefined,
                phone:             form.telNo || undefined,
                workPermitNumber:  form.workPermitNo || undefined,
                workPermitIssue:   form.workPermitIssue || undefined,
                workPermitExpiry:  form.workPermitExpiry || undefined,
            });
            setAdvisor(res.data.data);
            toast.success('Profile updated');
            setEditing(false);
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="bg-white w-full flex-1 rounded-2xl p-6 animate-pulse flex flex-col gap-4">
                <div className="h-8 bg-gray-100 rounded w-1/4" />
                <div className="h-32 bg-gray-100 rounded-2xl" />
                <div className="h-64 bg-gray-100 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col">
            <h1 className="text-2xl font-semibold text-primary pb-3">My Profile</h1>
            <div className="w-full h-full flex flex-col gap-3">

                <div className="flex items-center justify-start gap-6 border rounded-2xl px-6 py-4">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-primary flex items-center justify-center text-white text-3xl font-bold shrink-0">
                        {photoUrl
                            ? <img src={photoUrl} alt="profile" className="w-full h-full object-cover" />
                            : [form.firstName, form.lastName].filter(Boolean).map(w => w[0]).join('').toUpperCase() || '?'
                        }
                    </div>
                    <div className="flex flex-col items-start justify-around gap-3 h-full">
                        <p className="text-xl font-medium">{[form.prefix, form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')}</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className="text-primary bg-secondary px-3 py-2 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            <FiUpload /> {uploadingPhoto ? 'Uploading…' : 'Upload New Photo'}
                        </button>
                    </div>
                </div>

                <div className="border flex-1 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-xl font-medium text-primary">Personal Information</p>
                        <div className="flex gap-2">
                            {editing ? (
                                <>
                                    <button
                                        onClick={() => { setForm(advisor ? mapAdvisorToForm(advisor) : form); setEditing(false); }}
                                        className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-primary rounded-full px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving…' : 'Save'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex items-center gap-2 border border-primary rounded-full px-4 py-2 text-sm text-primary hover:bg-secondary"
                                >
                                    <MdModeEditOutline /> Edit
                                </button>
                            )}
                        </div>
                    </div>

                    <div id="personal" className="flex flex-col gap-5">
                        {editing ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <EditField label="Prefix" value={form.prefix} onChange={set('prefix')} />
                                    <EditField label="First Name" value={form.firstName} onChange={set('firstName')} />
                                    <EditField label="Last Name" value={form.lastName} onChange={set('lastName')} />
                                    <EditField label="Tel No." value={form.telNo} onChange={set('telNo')} />
                                    <EditField label="Email" value={form.email} onChange={set('email')} />
                                    <EditField label="Middle Name" value={form.middleName} onChange={set('middleName')} />
                                    <EditField label="Nationality" value={form.nationality} onChange={set('nationality')} />
                                </div>
                                <hr />
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-primary">Work Permit Issue</label>
                                        <DateSelect value={form.workPermitIssue} onChange={set('workPermitIssue')} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-primary">Work Permit Expiry</label>
                                        <DateSelect value={form.workPermitExpiry} onChange={set('workPermitExpiry')} />
                                    </div>
                                    <EditField label="Work Permit No." value={form.workPermitNo} onChange={set('workPermitNo')} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-8 gap-y-5">
                                    <ViewField label="Prefix" value={form.prefix} />
                                    <ViewField label="First Name" value={form.firstName} />
                                    <ViewField label="Middle Name" value={form.middleName} />
                                    <ViewField label="Last Name" value={form.lastName} />
                                    <ViewField label="Tel No." value={form.telNo} />
                                    <ViewField label="Email" value={form.email} />
                                    <ViewField label="Nationality" value={form.nationality} />
                                </div>
                                <hr className="border-gray-100" />
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-5">
                                    <ViewField label="Work Permit Issue" value={form.workPermitIssue} />
                                    <ViewField label="Work Permit Expiry" value={form.workPermitExpiry} />
                                    <ViewField label="Work Permit No." value={form.workPermitNo} />
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
export default AdvisorProfilePage;
