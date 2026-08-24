import RoleLayout from '@/components/layout/RoleLayout';

export default function DeanLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="dean">{children}</RoleLayout>;
}
