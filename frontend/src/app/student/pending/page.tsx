'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { studentMeApi } from '@/lib/api';
import { RiTimeLine } from 'react-icons/ri';
import { RiCheckboxCircleLine } from 'react-icons/ri';

export default function StudentPendingPage() {
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      const status = s.registrationStatus;
      const regStep = s.registrationStep;

      // If already approved, redirect appropriately
      if (status === 'ACTIVE') {
        if (regStep === 1) {
          router.replace('/student/profile');
        } else {
          router.replace('/student/dashboard');
        }
        return;
      }
      setStep(regStep);
    }).catch(() => {});
  }, [router]);

  if (step === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center gap-6 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
          <RiTimeLine size={40} className="text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-primary">Waiting for Approval</h1>
          <p className="text-sm text-gray-500 mt-2">
            {step === 1
              ? 'Your Phase 1 registration has been submitted. Please wait for staff to review and approve your information.'
              : 'Your Phase 2 registration has been submitted. Staff will review your documents and complete your academic information.'}
          </p>
        </div>
        <div className="w-full bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <RiCheckboxCircleLine size={18} className="text-green-500 shrink-0" />
            <span className="text-sm text-gray-700">Phase {step} registration submitted</span>
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
