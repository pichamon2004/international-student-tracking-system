'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

const ERROR_MESSAGES: Record<string, string> = {
  no_code:      'Google login cancelled.',
  inactive:     'Your account has been deactivated. Please contact staff.',
  no_role:      'Your account has not been assigned a role yet. Please contact staff.',
  oauth_failed: 'Google login failed. Please try again.',
};

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  useEffect(() => {
    const token = searchParams.get('token');
    const role  = searchParams.get('role');
    const error = searchParams.get('error');

    if (error) {
      const msg = ERROR_MESSAGES[error] ?? 'An error occurred during login.';
      router.replace(`/login?error=${encodeURIComponent(msg)}`);
      return;
    }

    if (!token || !role) {
      router.replace('/login');
      return;
    }

    loginWithGoogle(token)
      .then(() => {
        if (role === 'STUDENT')      router.replace('/student/dashboard');
        else if (role === 'ADVISOR') router.replace('/advisor/dashboard');
        else                         router.replace('/staff/dashboard');
      })
      .catch(() => router.replace('/login?error=Login+failed'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#DEEBFF' }}>
      <div className="bg-white rounded-2xl shadow-lg px-10 py-8 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
