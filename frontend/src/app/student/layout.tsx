'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import RoleLayout from '@/components/layout/RoleLayout';
import { studentMeApi } from '@/lib/api';

// Pages that don't need the registration check
const EXEMPT_PATHS = ['/student/register', '/student/pending'];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isExempt = EXEMPT_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (isExempt) {
      setChecked(true);
      return;
    }

    studentMeApi.get()
      .then(res => {
        const s = res.data.data;
        const status = s.registrationStatus;
        const step = s.registrationStep;

        if (status === 'PENDING_APPROVAL' && step === 0) {
          // Staff created account, student hasn't started Phase 1
          router.replace('/student/register');
        } else if (status === 'PENDING_APPROVAL' && (step === 1 || step === 2)) {
          // Waiting for staff approval
          router.replace('/student/pending');
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true)); // On error, let through
  }, [isExempt, router, pathname]);

  if (!isExempt && !checked) {
    return (
      <div className="relative min-h-screen bg-secondary flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <RoleLayout role="student">{children}</RoleLayout>;
}
