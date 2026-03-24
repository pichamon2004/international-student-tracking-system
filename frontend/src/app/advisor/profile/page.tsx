'use client';

import { useState } from 'react';
import { FiUpload } from "react-icons/fi";
import { MdModeEditOutline } from "react-icons/md";

const mockAdvisor = {
    prefix: 'Asst. Prof.',
    firstName: 'Pusadee',
    middleName: '',
    lastName: 'Seresangtakul',
    telNo: '+66 43 202 222',
    email: 'pusadees@kku.ac.th',
    nationality: 'Thai',
    workPermitIssue: '01/01/2020',
    workPermitExpiry: '31/12/2026',
    workPermitNo: 'WP-12345678',
    workPermitImageUrl: 'https://scontent.fkkc3-1.fna.fbcdn.net/v/t39.30808-6/598526615_25528114996801169_2991659731747781961_n.jpg?stp=dst-jpg_s590x590_tt6&_nc_cat=105&ccb=1-7&_nc_sid=13d280&_nc_ohc=C26kKgNcJtkQ7kNvwHmHivI&_nc_oc=AdrJI8CBg8SX5Fy89oiP7kjxvp5IdB-cYMFe3Eqr-7jUY_aujEqbSTdrv23CJztVOiU&_nc_zt=23&_nc_ht=scontent.fkkc3-1.fna&_nc_gid=Eaxs4gJ1rbBC7vg_cV_fJA&_nc_ss=7a32e&oh=00_AfyJdku8VKV0d9buMKoMUmdygL9Sc8lXHQhc237QfQVqsA&oe=69C76F64',
};

function ViewField({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-primary/50">{label}</span>
            <span className="text-sm font-semibold text-primary">{value}</span>
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

function AdvisorProfilePage() {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(mockAdvisor);

    function set(key: keyof typeof mockAdvisor) {
        return (v: string) => setForm(prev => ({ ...prev, [key]: v }));
    }

    return (
        <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col">
            <h1 className="text-2xl font-semibold text-primary pb-3">My Profile</h1>
            <div className="w-full h-full flex flex-col gap-3">

                <div className="flex items-center justify-start gap-6 border rounded-2xl px-6 py-4">
                    <img src="https://api.computing.kku.ac.th//storage/images/1661876218-pusadeeseresangtakul1_1.png" alt="Photo" className="w-24 h-24 rounded-xl object-cover" />
                    <div className="flex flex-col items-start justify-around gap-3 h-full">
                        <p className="text-xl font-medium">{form.prefix} {form.firstName} {form.middleName} {form.lastName}</p>
                        <button className="text-primary bg-secondary px-3 py-2 rounded-xl flex items-center justify-center gap-3">
                            <FiUpload /> Upload New Photo
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
                                        onClick={() => setEditing(false)}
                                        className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="flex items-center gap-2 bg-primary rounded-full px-4 py-2 text-sm text-white hover:bg-primary/90"
                                    >
                                        Save
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
                                    <EditField label="Work Permit Issue" value={form.workPermitIssue} onChange={set('workPermitIssue')} />
                                    <EditField label="Work Permit Expiry" value={form.workPermitExpiry} onChange={set('workPermitExpiry')} />
                                    <EditField label="Work Permit No." value={form.workPermitNo} onChange={set('workPermitNo')} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-primary">Work Permit Image</label>
                                    <div className='flex gap-3 flex-col md:flex-row'>
                                        <img src={form.workPermitImageUrl} alt="Work Permit" className="w-48 rounded-xl border border-gray-200 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        <button className="self-start text-primary bg-secondary px-3 py-2 rounded-xl flex items-center gap-2 text-sm"><FiUpload /> Upload New Image</button>
                                    </div>
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
                                <div className="grid grid-cols-1 md:grid-cols-4 2xl:grid-cols-3 gap-x-8 gap-y-5">
                                    <ViewField label="Work Permit Issue" value={form.workPermitIssue} />
                                    <ViewField label="Work Permit Expiry" value={form.workPermitExpiry} />
                                    <ViewField label="Work Permit No." value={form.workPermitNo} />
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-medium text-primary/50">Work Permit Image</span>
                                    <img src={form.workPermitImageUrl} alt="Work Permit" className="w-48 rounded-xl border border-gray-200 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                </div>
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