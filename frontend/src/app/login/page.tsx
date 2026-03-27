'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

function LoginContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) return;
    const messages: Record<string, string> = {
      not_registered: 'Your email is not registered. Please contact the college office to pre-register.',
      inactive: 'Your account has been deactivated. Please contact staff.',
      no_role: 'Your account has no role assigned. Please contact staff.',
      oauth_failed: 'Google sign-in failed. Please try again.',
      no_code: 'Google sign-in was cancelled.',
    };
    toast.error(messages[error] ?? decodeURIComponent(error));
  }, []);

  const handleGoogleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#DEEBFF' }}>

      {/* Decorative circles */}
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(120vw, 80rem)', height: 'min(120vw, 80rem)', top: 'max(-60vw, -40rem)', left: 'max(-60vw, -40rem)' }} />
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(95vw, 64rem)', height: 'min(95vw, 64rem)', top: 'max(-47.5vw, -32rem)', left: 'max(-47.5vw, -32rem)' }} />
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(70vw, 48rem)', height: 'min(70vw, 48rem)', top: 'max(-35vw, -24rem)', left: 'max(-35vw, -24rem)' }} />
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(120vw, 80rem)', height: 'min(120vw, 80rem)', bottom: 'max(-60vw, -40rem)', right: 'max(-60vw, -40rem)' }} />
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(95vw, 64rem)', height: 'min(95vw, 64rem)', bottom: 'max(-47.5vw, -32rem)', right: 'max(-47.5vw, -32rem)' }} />
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(70vw, 48rem)', height: 'min(70vw, 48rem)', bottom: 'max(-35vw, -24rem)', right: 'max(-35vw, -24rem)' }} />

      {/* Card */}
      <div className="flex flex-col items-center justify-between relative z-10 bg-white rounded-2xl shadow-lg w-full max-w-[600px] mx-6 pt-8">

        {/* Logo */}
        <div className="flex items-center">
          <img src="./logo.png" alt="logo" width={280} height={96} />
        </div>

        <div className="flex flex-col items-center w-full gap-6 px-8 md:px-16 pb-10">

          {/* Welcome Text */}
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-2xl md:text-3xl font-semibold text-primary">Welcome Back</p>
            <p className="text-sm md:text-base text-gray-500">Sign in with your KKU account to continue</p>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-4 border border-gray-300 rounded-full py-3 px-6 text-gray-700 font-medium hover:bg-gray-50 transition md:text-xl"
          >
            <FcGoogle size={36} />
            Sign in with KKU Mail
          </button>

        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-10 py-6 w-full flex justify-between items-center">
          <a href="https://pdp.kku.ac.th/policy/680656708694016000?lang=th" target="_blank" className="text-md font-medium" style={{ color: '#1a5fa8' }}>Privacy Policy</a>
          <a href="/dev" className="text-xs text-gray-400 hover:text-gray-600 transition">Dev Console</a>
          <a href="https://ssonext.kku.ac.th/support" target="_blank" className="text-md font-medium" style={{ color: '#1a5fa8' }}>Help</a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
