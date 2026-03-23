'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  RiUserStarLine,
  RiLogoutBoxLine,
  RiUser3Line,
  RiFileTextLine,
  RiNotification3Line,
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
  staff: [
    { href: '/staff/dashboard', label: 'Dashboard', icon: AiFillPieChart },
    { href: '/staff/advisors', label: 'Teacher Management', icon: RiUserStarLine },
    { href: '/staff/request', label: 'Request Management', icon: TbClipboardList },
    { href: '/staff/students', label: 'Student Management', icon: BsPeopleFill },
    { href: '/staff/documents', label: 'Documents', icon: RiFileTextLine },
    { href: '/staff/notification', label: 'Notification', icon: RiNotification3Line },
  ],
};

const pendingCount = 2;

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

  const initials = mockUser.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  // 🔥 คุมทีละ item
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // sync กับ path (refresh แล้วยังค้าง)
  useEffect(() => {
    setActiveItem(pathname);
  }, [pathname]);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="logo" className="h-10 w-auto" />
      </div>

      {/* Nav */}
      <div className="flex items-center gap-1 flex-1 justify-center">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const showBadge = label === 'Request Management' && pendingCount > 0;

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

              {/* Badge */}
              {showBadge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
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
            {mockUser.avatar ? (
              <img src={mockUser.avatar} alt={mockUser.name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>

          <div className="hidden md:flex flex-col leading-tight text-left">
            <span className="text-sm font-semibold text-primary">{mockUser.name}</span>
            <span className="text-xs text-gray-400 capitalize">{mockUser.role}</span>
          </div>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
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