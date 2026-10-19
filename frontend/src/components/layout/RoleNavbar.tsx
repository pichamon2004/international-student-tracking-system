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
  RiMenuLine,
  RiCloseLine,
} from 'react-icons/ri';
import { IconType } from 'react-icons';
import { clsx } from 'clsx';
import { AiFillPieChart } from 'react-icons/ai';
import { TbClipboardList } from 'react-icons/tb';
import { BsPeopleFill } from 'react-icons/bs';
import { useState, useRef, useEffect } from 'react';
import NotificationBell from './NotificationBell';

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
    { href: '/advisor/profile', label: 'Profile', icon: RiUser3Line },
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

  const ROLE_LABELS: Record<string, string> = { VICE_DEAN: 'Executive' };

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

  // Phones: the menu items open as a grid of tiles from the ☰ button
  const [menuOpen, setMenuOpen] = useState(false);

  // The name next to the avatar gives way when the nav row needs the room
  // (e.g. a hovered item expanding its label): it shrinks, and once it would be
  // cut off it collapses so the avatar sits at the right edge. It comes back
  // only when the nav row has room for the whole name again.
  const nameRef = useRef<HTMLDivElement>(null);
  const navRowRef = useRef<HTMLDivElement>(null);
  const [nameClipped, setNameClipped] = useState(false);
  const nameClippedRef = useRef(false);
  const nameWidthRef = useRef(0);
  useEffect(() => {
    const el = nameRef.current;
    const row = navRowRef.current;
    if (!el || !row) return;
    const check = () => {
      let clipped: boolean;
      if (!nameClippedRef.current) {
        // Collapsed (below 900px) there's nothing to measure — keep the last width
        const natural = Math.max(0, ...Array.from(el.children).map(c => c.scrollWidth));
        if (natural > 0) nameWidthRef.current = natural;
        clipped = natural > el.clientWidth + 1;
      } else {
        const links = Array.from(row.children) as HTMLElement[];
        const used = links.reduce((sum, c) => sum + c.offsetWidth, 0) + 4 * Math.max(0, links.length - 1);
        clipped = row.clientWidth - used < nameWidthRef.current + 10;
      }
      nameClippedRef.current = clipped;
      setNameClipped(clipped);
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    ro.observe(row);
    Array.from(row.children).forEach(c => ro.observe(c));
    return () => ro.disconnect();
  }, [items.length]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

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
    <nav className="relative bg-white rounded-b-2xl shadow-sm px-3 md:px-6 py-3 flex items-center justify-between gap-2 md:gap-6">

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="logo" className="h-8 md:h-10 w-auto" />
      </div>

      {/* Nav (phones use the ☰ tile grid below instead) */}
      <div ref={navRowRef} className="hidden min-[900px]:flex items-center gap-1 flex-1 justify-center ">
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

      {/* Phones: push the bell, avatar and ☰ to the right */}
      <div className="flex-1 min-[900px]:hidden" />

      {/* Notifications */}
      <NotificationBell />

      {/* Avatar */}
      <div className="relative min-w-0" ref={dropdownRef}>
        <button
          onClick={() => { setOpen((prev) => !prev); setMenuOpen(false); }}
          className="flex items-center gap-2.5 max-w-full rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-all duration-200"
        >
          <div className="w-9 h-9 shrink-0 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
            {initials}
          </div>

          <div ref={nameRef} className={clsx('hidden min-[900px]:flex flex-col min-w-0 overflow-hidden leading-tight text-left', nameClipped && '!hidden')}>
            <span className="text-sm font-semibold text-primary whitespace-nowrap">{displayName}</span>
            <span className="text-xs text-gray-400 capitalize whitespace-nowrap">{displayRole}</span>
          </div>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            <div className={clsx('px-4 py-3 border-b border-gray-100', !nameClipped && 'min-[900px]:hidden')}>
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

      {/* Phones: ☰ opens the menu as a grid of tiles */}
      <button
        type="button"
        onClick={() => { setMenuOpen(v => !v); setOpen(false); }}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        className={clsx(
          'min-[900px]:hidden w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-primary transition-colors',
          menuOpen ? 'bg-[#C4E8FF]' : 'hover:bg-[#C4E8FF]'
        )}
      >
        {menuOpen ? <RiCloseLine size={22} /> : <RiMenuLine size={22} />}
      </button>

      {menuOpen && (
        <>
          <div className="min-[900px]:hidden fixed inset-0 z-40 bg-black/20" onClick={() => setMenuOpen(false)} />
          <div className="min-[900px]:hidden absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-lg border border-gray-100 p-3 grid grid-cols-3 gap-2">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-1 text-center text-xs font-medium leading-tight transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-[#C4E8FF] text-primary'
                    : 'text-gray-500 hover:bg-[#C4E8FF] hover:text-primary'
                )}
              >
                <Icon size={22} />
                <span className="line-clamp-2">{label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}