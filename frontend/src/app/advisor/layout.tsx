import RoleLayout from '@/components/layout/RoleLayout';

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout role="advisor">{children}</RoleLayout>;
}
