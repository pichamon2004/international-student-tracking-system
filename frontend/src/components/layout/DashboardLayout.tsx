'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import Sidebar from './Sidebar';
import Container from '@/components/ui/Container';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!user) fetchMe();
  }, [token, user, fetchMe, router]);

  if (!token) return null;

  return (
    <div className="min-h-screen flex justify-center bg-gray-50">
      
      <Container className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </Container>
    </div>
  );
}
