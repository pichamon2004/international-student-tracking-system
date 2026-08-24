'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { studentMeApi } from '@/lib/api';
import { RiTimeLine, RiCheckboxCircleLine } from 'react-icons/ri';

export default function StudentPendingPage() {
  const router = useRouter();

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      if (s.registrationStatus === 'ACTIVE') {
        router.replace('/student/dashboard');
      }
    }).catch(() => {});
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center gap-6 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
          <RiTimeLine size={40} className="text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-primary">Waiting for Approval</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your registration documents have been submitted. Staff will review and complete your academic information.
          </p>
        </div>
        <div className="w-full bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <RiCheckboxCircleLine size={18} className="text-green-500 shrink-0" />
            <span className="text-sm text-gray-700">Registration documents submitted</span>
          </div>
          <div className="flex items-center gap-3">
            <RiTimeLine size={18} className="text-yellow-500 shrink-0" />
            <span className="text-sm text-gray-500">Waiting for staff review...</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          You will receive a notification once your registration is approved.
        </p>
      </div>
    </div>
  );
}
