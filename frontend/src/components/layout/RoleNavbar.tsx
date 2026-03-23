'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RiBarChartLine, RiUserStarLine, RiSettings3Line, RiLogoutBoxLine, RiUser3Line } from 'react-icons/ri';
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
}

const navConfig: Record<string, NavItem[]> = {
  student: [
    { href: '/student/dashboard', label: 'Dashboard',          icon: AiFillPieChart },
    { href: '/student/request',   label: 'Documents',          icon: TbClipboardList },
    { href: '/student/profile',   label: 'Profile',            icon: RiUser3Line },
  ],
  advisor: [
    { href: '/advisor/dashboard', label: 'Dashboard',          icon: AiFillPieChart },
    { href: '/advisor/request',   label: 'Request Management', icon: TbClipboardList },
    { href: '/advisor/students',  label: 'Student Management', icon: BsPeopleFill },
  ],
  staff: [
    { href: '/staff/dashboard',   label: 'Dashboard',          icon: AiFillPieChart },
    { href: '/staff/students',    label: 'Students',           icon: BsPeopleFill },
    { href: '/staff/advisors',    label: 'Advisors',           icon: RiUserStarLine },
    { href: '/staff/request',     label: 'Documents',          icon: TbClipboardList },
    { href: '/staff/reports',     label: 'Reports',            icon: RiBarChartLine },
    { href: '/staff/settings',    label: 'Settings',           icon: RiSettings3Line },
  ],
};

const pendingCount = 2; // Mock — replace with real data later

// Mock user — replace with real auth data later
const mockUser = {
  name: 'Somchai Jaidee',
  role: 'Advisor',
  avatar: null as string | null,
};

interface RoleNavbarProps {
  role: 'student' | 'advisor' | 'staff';
}

export default function RoleNavbar({ role }: RoleNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navConfig[role];
  const initials = mockUser.name.split(' ').map(w => w[0]).join('').toUpperCase();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    <nav className="bg-white rounded-b-2xl shadow-sm px-6 py-3 flex items-center justify-between gap-6">

      {/* Left: Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="logo" className="h-10 w-auto" />
      </div>

      {/* Center: Nav Items */}
      <div className="flex items-center gap-1 flex-1 justify-center">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
                active
                  ? 'bg-[#C4E8FF] text-primary'
                  : 'text-gray-500 hover:bg-[#C4E8FF] hover:text-primary'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right: Avatar with dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-all duration-200"
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
            {mockUser.avatar
              ? <img src={mockUser.avatar} alt={mockUser.name} className="w-full h-full object-cover" />
              : initials
            }
          </div>
          {/* Name + Role */}
          <div className="hidden md:flex flex-col leading-tight text-left">
            <span className="text-sm font-semibold text-primary">{mockUser.name}</span>
            <span className="text-xs text-gray-400 capitalize">{mockUser.role}</span>
          </div>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            {/* User info (mobile fallback) */}
            <div className="md:hidden px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-primary">{mockUser.name}</p>
              <p className="text-xs text-gray-400 capitalize">{mockUser.role}</p>
            </div>
            <button
              onClick={() => { setOpen(false); router.push(`/${role}/profile`); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RiUser3Line size={16} />
              Profile
            </button>
            <hr className="my-1 border-gray-100" />
            <button
              onClick={() => {}}
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
