'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { RoleInfo } from '@/types';
import {
  RiGraduationCapLine,
  RiUserStarLine,
  RiBriefcaseLine,
  RiShieldKeyholeLine,
  RiUser3Line,
} from 'react-icons/ri';
import { IconType } from 'react-icons';

const ROLE_ICONS: Record<string, IconType> = {
  STUDENT: RiGraduationCapLine,
  ADVISOR: RiUserStarLine,
  STAFF:   RiBriefcaseLine,
  ADMIN:   RiShieldKeyholeLine,
  DEAN:    RiShieldKeyholeLine,
};

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'text-blue-500 bg-blue-50',
  ADVISOR: 'text-amber-500 bg-amber-50',
  STAFF:   'text-green-500 bg-green-50',
  ADMIN:   'text-purple-500 bg-purple-50',
  DEAN:    'text-purple-500 bg-purple-50',
};

const ROLE_DASHBOARD: Record<string, string> = {
  STUDENT: '/student/dashboard',
  ADVISOR: '/advisor/dashboard',
  STAFF:   '/staff/dashboard',
  ADMIN:   '/staff/dashboard',
  DEAN:    '/dean/dashboard',
};

function SelectRoleContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { selectRole, roles, requireRoleSelection, isLoading } = useAuthStore();

  const [localRoles, setLocalRoles] = useState<RoleInfo[]>([]);
  const [selecting, setSelecting]   = useState<number | null>(null);

  useEffect(() => {
    const rolesParam = searchParams.get('roles');
    const tempParam  = searchParams.get('tempToken');

    if (rolesParam && tempParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rolesParam));
        setLocalRoles(parsed);
        useAuthStore.setState({ tempToken: tempParam, requireRoleSelection: true });
      } catch {
        router.replace('/login');
      }
      return;
    }

    if (requireRoleSelection && roles.length > 0) {
      setLocalRoles(roles);
      return;
    }

    router.replace('/login');
  }, []);

  const handleSelect = async (roleId: number, roleCode: string) => {
    setSelecting(roleId);
    try {
      await selectRole(roleId);
      const dashboard = ROLE_DASHBOARD[roleCode] ?? '/staff/dashboard';
      router.replace(dashboard);
    } catch {
      setSelecting(null);
    }
  };

  const displayRoles = localRoles.length > 0 ? localRoles : roles;

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#DEEBFF' }}>

      {/* Decorative circles */}
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(120vw, 80rem)', height: 'min(120vw, 80rem)', top: 'max(-60vw, -40rem)', left: 'max(-60vw, -40rem)' }} />
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(95vw, 64rem)', height: 'min(95vw, 64rem)', top: 'max(-47.5vw, -32rem)', left: 'max(-47.5vw, -32rem)' }} />
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(120vw, 80rem)', height: 'min(120vw, 80rem)', bottom: 'max(-60vw, -40rem)', right: 'max(-60vw, -40rem)' }} />
      <div className="absolute rounded-full opacity-60" style={{ backgroundColor: '#0776BC', width: 'min(95vw, 64rem)', height: 'min(95vw, 64rem)', bottom: 'max(-47.5vw, -32rem)', right: 'max(-47.5vw, -32rem)' }} />

      <div className="relative z-10 bg-white rounded-2xl shadow-lg w-full max-w-[480px] mx-6 px-8 py-10 flex flex-col items-center gap-8">

        <img src="/logo.png" alt="logo" width={200} height={68} />

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-2xl font-semibold text-gray-800">เลือกบทบาท</p>
          <p className="text-sm text-gray-500">กรุณาเลือกบทบาทที่ต้องการใช้งานในครั้งนี้</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {displayRoles.map((role) => {
            const Icon       = ROLE_ICONS[role.code] ?? RiUser3Line;
            const colorClass = ROLE_COLORS[role.code] ?? 'text-gray-500 bg-gray-50';
            const isLoading_ = selecting === role.id;

            return (
              <button
                key={role.id}
                onClick={() => handleSelect(role.id, role.code)}
                disabled={isLoading || selecting !== null}
                className="w-full flex items-center gap-4 border-2 border-gray-200 rounded-xl px-5 py-4 text-left hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon size={22} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-gray-800 group-hover:text-primary transition-colors">{role.name}</span>
                  <span className="text-xs text-gray-400">{role.code}</span>
                </div>
                {isLoading_ ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-200 group-hover:bg-primary transition-colors flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense>
      <SelectRoleContent />
    </Suspense>
  );
}
