'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import {
  RiUserStarLine,
  RiLogoutBoxLine,
  RiUser3Line,
  RiNotification3Line,
  RiSettings3Line,
  RiShieldKeyholeLine,
  RiFileListLine,
  RiTeamLine,
  RiGraduationCapLine,
  RiBriefcaseLine,
  RiCheckLine,
  RiArrowLeftRightLine,
} from 'react-icons/ri';
import { IconType } from 'react-icons';
import { clsx } from 'clsx';
import { AiFillPieChart } from 'react-icons/ai';
import { TbClipboardList } from 'react-icons/tb';
import { BsPeopleFill } from 'react-icons/bs';
import { useState, useRef, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: IconType;
  /** If set, the item only shows when the user holds this permission code. */
  permission?: string;
}

const navConfig: Record<string, NavItem[]> = {
  student: [
    { href: '/student/dashboard', label: 'Dashboard', icon: AiFillPieChart },
    { href: '/student/request', label: 'Documents', icon: TbClipboardList },
    { href: '/student/profile', label: 'Profile', icon: RiUser3Line },
  ],
  advisor: [
    { href: '/advisor/dashboard', label: 'Dashboard', icon: AiFillPieChart },
    { href: '/advisor/request', label: 'Request Management', icon: TbClipboardList },
    { href: '/advisor/students', label: 'Student Management', icon: BsPeopleFill },
  ],
  dean: [
    { href: '/dean/dashboard', label: 'Dashboard',          icon: AiFillPieChart },
    { href: '/dean/request',   label: 'Request Management', icon: TbClipboardList },
  ],
  staff: [
    { href: '/staff/dashboard',        label: 'Dashboard',          icon: AiFillPieChart },
    { href: '/staff/advisors',         label: 'Teacher Management', icon: RiUserStarLine, permission: 'ADVISOR_MANAGEMENT.view' },
    { href: '/staff/request',          label: 'Request Management', icon: TbClipboardList, permission: 'REQUEST_MANAGEMENT.view' },
    { href: '/staff/students',         label: 'Student Management', icon: BsPeopleFill, permission: 'STUDENT_MANAGEMENT.view' },
    { href: '/staff/change-requests',  label: 'Change Requests',    icon: RiCheckLine },
    { href: '/staff/notification',     label: 'Notification',       icon: RiNotification3Line },
    { href: '/staff/settings',         label: 'Settings',           icon: RiSettings3Line },
  ],
};

interface RoleNavbarProps {
  role?: 'student' | 'advisor' | 'staff' | 'dean';
}

export default function RoleNavbar({ role }: RoleNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, token, fetchMe, activeRole, hasPermission, roles, selectRole, fetchRoles } = useAuthStore();

  const ROLE_ICONS: Record<string, IconType> = {
    STUDENT:   RiGraduationCapLine,
    ADVISOR:   RiUserStarLine,
    STAFF:     RiBriefcaseLine,
    ADMIN:     RiShieldKeyholeLine,
    DEAN:      RiShieldKeyholeLine,
    VICE_DEAN: RiShieldKeyholeLine,
  };

  const ROLE_DASHBOARD: Record<string, string> = {
    STUDENT:   '/student/dashboard',
    ADVISOR:   '/advisor/dashboard',
    STAFF:     '/staff/dashboard',
    ADMIN:     '/staff/dashboard',
    DEAN:      '/dean/dashboard',
    VICE_DEAN: '/dean/dashboard',
  };

  const switchRole = async (roleId: number, roleCode: string) => {
    if (roleCode === activeRole) return;
    try {
      await selectRole(roleId);
      setOpen(false);
      router.replace(ROLE_DASHBOARD[roleCode] ?? '/staff/dashboard');
    } catch { /* ignore */ }
  };

  const resolvedRole: 'student' | 'advisor' | 'staff' | 'dean' =
    role ?? (activeRole === 'STUDENT' ? 'student' : activeRole === 'ADVISOR' ? 'advisor' : activeRole === 'DEAN' ? 'dean' : 'staff');

  const baseItems = navConfig[resolvedRole].filter(
    item => !item.permission || hasPermission(item.permission)
  );
  const adminItems = [
    { href: '/manage/roles',   label: 'Roles & Permissions', icon: RiShieldKeyholeLine },
    { href: '/manage/modules', label: 'Modules',             icon: RiSettings3Line },
    ...(hasPermission('USER_MANAGEMENT.view')
      ? [{ href: '/manage/users',      label: 'Users',      icon: RiTeamLine }]
      : []),
    ...(hasPermission('AUDIT_LOG.view')
      ? [{ href: '/manage/audit-logs', label: 'Audit Log',  icon: RiFileListLine }]
      : []),
  ];
  const staffItems = [
    ...baseItems,
    ...(hasPermission('USER_MANAGEMENT.view')
      ? [{ href: '/manage/users',      label: 'Users',      icon: RiTeamLine }]
      : []),
    ...(hasPermission('AUDIT_LOG.view')
      ? [{ href: '/manage/audit-logs', label: 'Audit Log',  icon: RiFileListLine }]
      : []),
  ];
  const items = activeRole === 'ADMIN' ? adminItems : staffItems;

  useEffect(() => {
    if (token && !user) {
      fetchMe();
    }
  }, [token, user, fetchMe]);

  const ROLE_LABELS: Record<string, string> = { VICE_DEAN: 'Vice Dean' };

  const displayName = user?.name ?? '';
  const displayRole = activeRole
    ? (ROLE_LABELS[activeRole] ?? activeRole.charAt(0) + activeRole.slice(1).toLowerCase())
    : resolvedRole;
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';

  // 🔥 คุมทีละ item
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // sync กับ path (refresh แล้วยังค้าง)
  useEffect(() => {
    setActiveItem(pathname);
  }, [pathname]);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Refresh roles list every time dropdown opens so newly assigned roles appear immediately
  useEffect(() => {
    if (open && token) fetchRoles();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white rounded-b-2xl shadow-sm px-6 py-3 flex items-center justify-between gap-6 ">

      {/* Logo */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="logo" className="h-10 w-auto" />
      </div>

      {/* Nav */}
      <div className="flex items-center gap-1 flex-1 justify-center ">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const isShow = activeItem === href || hoveredItem === href;

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setActiveItem(href)}
              onMouseEnter={() => setHoveredItem(href)}
              onMouseLeave={() => setHoveredItem(null)}
              className={clsx(
                'relative flex items-center rounded-xl transition-all duration-300',
                isShow ? 'px-4 py-2 gap-2' : 'p-3 justify-center',
                active
                  ? 'bg-[#C4E8FF] text-primary'
                  : 'text-gray-500 hover:bg-[#C4E8FF] hover:text-primary'
              )}
            >
              {/* Icon */}
              <Icon size={20} />

              {/* Label */}
              <span
                className={clsx(
                  'whitespace-nowrap text-sm font-medium transition-all duration-300 overflow-hidden',
                  isShow ? 'opacity-100 w-auto ml-1' : 'opacity-0 w-0'
                )}
              >
                {label}
              </span>

            </Link>
          );
        })}
      </div>

      {/* Avatar */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-all duration-200"
        >
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
            {initials}
          </div>

          <div className="hidden md:flex flex-col leading-tight text-left">
            <span className="text-sm font-semibold text-primary">{displayName}</span>
            <span className="text-xs text-gray-400 capitalize">{displayRole}</span>
          </div>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            <div className="md:hidden px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-primary">{displayName}</p>
              <p className="text-xs text-gray-400 capitalize">{displayRole}</p>
            </div>

            {/* Switch role — show only when user has more than 1 role */}
            {roles.length > 1 && (
              <>
                <hr className="my-1 border-gray-100" />
                <div className="px-4 pt-1.5 pb-1 flex items-center gap-1.5">
                  <RiArrowLeftRightLine size={12} className="text-gray-400" />
                  <p className="text-xs font-medium text-gray-400">เปลี่ยนบทบาท</p>
                </div>
                {roles.map(r => {
                  const Icon      = ROLE_ICONS[r.code] ?? RiUser3Line;
                  const isCurrent = r.code === activeRole;
                  return (
                    <button
                      key={r.id}
                      onClick={() => switchRole(r.id, r.code)}
                      disabled={isCurrent}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                        isCurrent
                          ? 'text-primary bg-primary/5 cursor-default'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={15} />
                      <span className="flex-1 text-left">{r.name}</span>
                      {isCurrent && <RiCheckLine size={14} className="text-primary" />}
                    </button>
                  );
                })}
              </>
            )}

            {roles.length > 1 && <hr className="my-1 border-gray-100" />}
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <RiLogoutBoxLine size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}