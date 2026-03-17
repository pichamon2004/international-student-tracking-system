'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, LayoutDashboard, FileText, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/students', label: 'นักศึกษาต่างชาติ', icon: Users },
  { href: '/templates', label: 'เทมเพลตเอกสาร', icon: FileText },
];

const adminItems = [
  { href: '/users', label: 'จัดการผู้ใช้', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-primary-900 text-white flex flex-col">
      <div className="p-6 border-b border-primary-700">
        <h1 className="font-bold text-lg leading-tight">ระบบติดตาม<br />นักศึกษาต่างชาติ</h1>
        <p className="text-primary-300 text-xs mt-1">วิทยาลัยการคอมพิวเตอร์</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
              pathname.startsWith(href)
                ? 'bg-primary-600 text-white'
                : 'text-primary-200 hover:bg-primary-800 hover:text-white'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs text-primary-400 uppercase tracking-wider">ผู้ดูแลระบบ</div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                  pathname.startsWith(href)
                    ? 'bg-primary-600 text-white'
                    : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-primary-700">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-primary-300">{user?.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-primary-200 hover:bg-primary-800 hover:text-white rounded-lg transition"
        >
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
