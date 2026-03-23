'use client';

import { FcGoogle } from "react-icons/fc";


export default function LoginPage() {
  const handleGoogleLogin = () => {
    // TODO: implement Google OAuth
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
      <div className="flex flex-col items-center justify-between relative z-10 bg-white rounded-2xl shadow-lg w-full max-w-[600px]  mx-6 h-[600px] md:h-[650px] pt-8">
        
        {/* Logo */}
        <div className="flex items-center ">
          <img src="./logo.png" alt="logo" width={280} height={96} />
        </div>

        <div className="flex flex-col items-center w-full gap-8 px-8 md:px-16 pb-12">

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
            {/* Google Icon */}
            <FcGoogle size={36}/>

            Sign in with KKU Mail
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-10 py-6 w-full flex justify-between">
          <a href="https://pdp.kku.ac.th/policy/680656708694016000?lang=th" target="_blank" className="text-md font-medium" style={{ color: '#1a5fa8' }}>Privacy Policy</a>
          <a href="https://ssonext.kku.ac.th/support" target="_blank" className="text-md font-medium" style={{ color: '#1a5fa8' }}>Help</a>
        </div>
      </div>
    </div>
  );
}
