'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BsPeopleFill } from 'react-icons/bs';
import { FaRegCircleCheck, FaListCheck } from 'react-icons/fa6';
import { advisorApi, requestApi, type ApiAdvisor } from '@/lib/api';

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [advisor, setAdvisor] = useState<ApiAdvisor | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      advisorApi.getById(Number(id)),
      requestApi.getAll(),
    ]).then(([advRes, reqRes]) => {
      const adv = advRes.data.data;
      setAdvisor(adv);

      const studentIds = new Set((adv.students ?? []).map(s => s.id));
      const reqs = reqRes.data.data.filter(r => studentIds.has(r.studentId));
      setPendingCount(reqs.filter(r => r.status === 'PENDING' || r.status === 'FORWARDED_TO_ADVISOR').length);
      setDoneCount(reqs.filter(r => r.status === 'DEAN_APPROVED' || r.status === 'STAFF_APPROVED').length);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded mb-6" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-6 text-gray-400 text-sm">
        Advisor not found.
      </div>
    );
  }

  const fullName = [advisor.titleEn, advisor.firstNameEn, advisor.lastNameEn].filter(Boolean).join(' ') || '—';
  const students = advisor.students ?? [];

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col">
      <h1 className="text-2xl font-semibold text-primary mb-6">Profile</h1>
      <div className="grid md:grid-cols-5 w-full h-full gap-6">

        {/* Left — personal info */}
        <div className="flex flex-col md:col-span-3 h-full w-full border-r-2">
          <div className="flex items-center justify-start gap-6 border-b-2 py-6">
            <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
              {(advisor.firstNameEn ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xl font-medium">{fullName}</p>
              <p className="text-sm text-gray-500">{advisor.position ?? ''}</p>
              <p className="text-sm text-gray-500">{advisor.faculty ?? ''}</p>
            </div>
          </div>

          <div className="flex-1 pt-6">
            <p className="text-xl font-medium text-primary mb-4">Contact Information</p>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <span className="text-xs text-gray-400 block">Email</span>
                {advisor.email ?? '—'}
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Phone</span>
                {advisor.phone ?? '—'}
              </div>
              {advisor.workPermitNumber && (
                <div>
                  <span className="text-xs text-gray-400 block">Work Permit No.</span>
                  {advisor.workPermitNumber}
                </div>
              )}
              {advisor.workPermitExpiry && (
                <div>
                  <span className="text-xs text-gray-400 block">Work Permit Expiry</span>
                  {new Date(advisor.workPermitExpiry).toLocaleDateString('en-GB')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — stats + students */}
        <div className="md:col-span-2">
          <div className="pb-6">
            <p className="py-6 text-xl font-medium text-primary">Tasks Overview</p>
            <div className="flex gap-4 flex-wrap">
              <div className="bg-[#BFE6FF] w-36 h-28 rounded-xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between">
                  <BsPeopleFill size={24} className="text-primary" />
                  <p className="text-xl">{students.length}</p>
                </div>
                <div className="w-full"><p className="text-xs font-normal">Total Students</p></div>
              </div>
              <div className="bg-[#BFFFC3] w-36 h-28 rounded-xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between">
                  <FaRegCircleCheck size={24} className="text-[#4BCA5E]" />
                  <p className="text-xl">{doneCount}</p>
                </div>
                <div className="w-full"><p className="text-xs font-normal">Done Requests</p></div>
              </div>
              <div className="bg-[#FFBFC0] w-36 h-28 rounded-xl p-4 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between">
                  <FaListCheck size={24} className="text-[#EE4F4F]" />
                  <p className="text-xl">{pendingCount}</p>
                </div>
                <div className="w-full"><p className="text-xs font-normal">Requests To Do</p></div>
              </div>
            </div>
          </div>

          <div>
            <p className="py-6 text-xl font-medium text-primary">Assigned Students</p>
            {students.length === 0 ? (
              <p className="text-sm text-gray-400">No students assigned.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {students.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        {[s.titleEn, s.firstNameEn, s.lastNameEn].filter(Boolean).join(' ') || '—'}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">{s.studentId ?? ''}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.registrationStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      s.registrationStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{s.registrationStatus}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
