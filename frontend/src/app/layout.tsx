import type { Metadata } from 'next';
import { Kanit, Sarabun } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const kanit = Kanit({ subsets: ['latin', 'thai'], weight: ['300', '400', '500', '600', '700'], variable: '--font-kanit', display: 'swap', preload: false });
const sarabun = Sarabun({ subsets: ['latin', 'thai'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sarabun', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: 'International Student Tracking System',
  description: 'ระบบติดตามนักศึกษาต่างชาติ - วิทยาลัยการคอมพิวเตอร์',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${kanit.variable} ${sarabun.variable} font-kanit`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
