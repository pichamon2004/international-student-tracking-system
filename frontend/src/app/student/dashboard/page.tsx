'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RiEyeLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { FaPlus } from "react-icons/fa6";
import { FaIdCard, FaPassport } from 'react-icons/fa6';
import { RiHealthBookFill } from "react-icons/ri";



const statCards = [
  { label: 'Passport Remaining',        addLabel: 'Passport',        value: 1, icon: FaPassport,       iconBg: '#FFC5C6', iconColor: '#FF0000' },
  { label: 'Visa Remaining',            addLabel: 'VISA',            value: 2, icon: FaIdCard,         iconBg: '#DFC2FF', iconColor: '#8B2CF5' },
  { label: 'Health Insurance Remaining',addLabel: 'Health Insurance',value: null, icon: RiHealthBookFill, iconBg: '#DEEBFF', iconColor: '#578FCA' },
];


const STEPS = ['Submitted', 'In Review', 'Approved', 'Processing', 'Completed'];

interface Request {
  id: string;
  title: string;
  startReq: string;
  updateReq: string;
  detail: string;
  step: number;
}

const mockRequests: Request[] = [
  { id: '1', title: 'ADDED VISA', startReq: '01/01/2001', updateReq: '01/01/2001', detail: '', step: 4 },
  { id: '2', title: 'ADDED VISA', startReq: '01/01/2001', updateReq: '01/01/2001', detail: '', step: 3 },
];

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className={clsx(
            'w-5 h-5 rounded-full border-2',
            i < step  ? 'bg-green-400 border-green-400' :
            i === step ? 'bg-yellow-400 border-yellow-400' :
                         'bg-white border-gray-300'
          )} />
          {i < STEPS.length - 1 && (
            <div className={clsx('w-4 h-0.5', i < step ? 'bg-green-400' : 'bg-gray-300')} />
          )}
        </div>
      ))}
    </div>
  );
}

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss'];
const COUNTRIES = ['Thailand', 'China', 'Japan', 'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Indonesia', 'Other'];
const PROGRAMS = ['Computer Engineering', 'Computer Science', 'Information Technology', 'Electrical Engineering', 'Other'];
const DEGREES = ["Bachelor's Degree", "Master's Degree", "Ph.D."];

function CreateAccountModal({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    prefix: '', firstName: '', middleName: '', lastName: '',
    email: '', country: '', program: '', degree: '', birthDate: '',
    reEntry: false,
  });

  function setField(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-primary";
  const selectCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 focus:outline-none focus:border-primary bg-white";
  const labelCls = "text-xs font-semibold text-primary mb-1";

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-10 flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-2xl font-bold text-primary">Wait</p>
            <p className="text-sm text-gray-500">Wait for your staff improve, we will send result to email</p>
          </div>
          <button
            onClick={onClose}
            className="bg-primary text-white text-sm font-semibold px-10 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8">
        <h2 className="text-2xl font-bold text-primary mb-6">Create Account</h2>

        <div className="flex flex-col gap-4">
          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col">
              <label className={labelCls}>Prefix</label>
              <select value={form.prefix} onChange={setField('prefix')} className={selectCls}>
                <option value="">— Select —</option>
                {PREFIXES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className={labelCls}>First Name</label>
              <input value={form.firstName} onChange={setField('firstName')} placeholder="First Name" className={inputCls} />
            </div>
            <div className="flex flex-col">
              <label className={labelCls}>Middle Name</label>
              <input value={form.middleName} onChange={setField('middleName')} placeholder="Middle Name" className={inputCls} />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className={labelCls}>Last Name</label>
              <input value={form.lastName} onChange={setField('lastName')} placeholder="Last Name" className={inputCls} />
            </div>
            <div className="flex flex-col">
              <label className={labelCls}>Email</label>
              <input value={form.email} onChange={setField('email')} placeholder="Email" type="email" className={inputCls} />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className={labelCls}>Country</label>
              <select value={form.country} onChange={setField('country')} className={selectCls}>
                <option value="">Select Country</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className={labelCls}>Program</label>
              <select value={form.program} onChange={setField('program')} className={selectCls}>
                <option value="">Select Program</option>
                {PROGRAMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className={labelCls}>Degree</label>
              <select value={form.degree} onChange={setField('degree')} className={selectCls}>
                <option value="">Select Degree</option>
                {DEGREES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className={labelCls}>Birth Date</label>
              <input value={form.birthDate} onChange={setField('birthDate')} type="date" className={inputCls} />
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.reEntry} onChange={setField('reEntry')} className="w-4 h-4 accent-primary" />
            I have already applied for a re-entry permit
          </label>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => setSent(true)}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [showCreateAccount, setShowCreateAccount] = useState(true); // true = first login

  return (
    <div className="flex flex-col gap-6 flex-1">
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} />}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-10">
        {statCards.map(({ label, addLabel, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm px-8 md:pl-8 md:pr-6 flex items-center gap-3 md:gap-4 h-[100px] 2xl:h-[130px]">
            {value === null ? (
              <p className="flex-1 text-center text-2xl font-semibold text-primary">
                Please add your<br />{addLabel}
              </p>
            ) : (
              <>
                <div className="rounded-full p-3 md:p-6 flex-shrink-0" style={{ backgroundColor: iconBg }}>
                  <Icon className="w-5 h-5 md:w-8 md:h-8 2xl:w-10 2xl:h-10" style={{ color: iconColor }} />
                </div>
                <div className="flex-1 text-right flex items-end flex-col justify-around h-full py-5">
                  <p className="text-3xl 2xl:text-5xl font-semibold text-primary">{value}</p>
                  <p className="text-xs 2xl:text-sm font-medium text-primary">{label}</p>
                </div>
                <span className="text-primary pb-2 text-base font-normal">Days</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Latest Request */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between">
          <p className=" font-bold text-primary text-2xl">Latest Request</p>
          <button
            onClick={() => router.push('/student/request')}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            <FaPlus size={16} /> REQ
          </button>
        </div>
        <hr />
        <div className={clsx('flex flex-col gap-6', mockRequests.length === 0 && 'flex-1 items-center justify-center')}>
          {mockRequests.length === 0 && (
            <p className="text-sm text-gray-400 text-center">There are no requests at this time.</p>
          )}
          {mockRequests.slice(0, 2).map(req => (
            <div key={req.id} className="bg-secondary rounded-xl p-4 flex flex-col gap-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col ">
                  <p className="text-lg font-semibold text-primary">{req.title}</p>
                </div>
                <StepDots step={req.step} />
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-400">Start REQ : {req.startReq}</p>
                  <p className="text-sm text-gray-400">Update REQ : {req.updateReq}</p>
                  <p className="text-sm text-gray-400">Detail Update : {req.detail}</p>
                </div>
                <div className='flex items-end justify-end '>
                  <button
                    onClick={() => router.push(`/student/request/${req.id}`)}
                    className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition"
                  >
                    <RiEyeLine size={13} /> view
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {mockRequests.length >= 1 && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => router.push('/student/request')}
              className="bg-primary text-white text-sm font-medium px-6 py-2 rounded-full hover:bg-primary/90 transition"
            >
              ดูคำร้องทั้งหมด
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
