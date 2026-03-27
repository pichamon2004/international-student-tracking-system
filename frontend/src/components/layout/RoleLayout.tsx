import RoleNavbar from './RoleNavbar';
import Container from '@/components/ui/Container';

interface RoleLayoutProps {
  role: 'student' | 'advisor' | 'staff';
  children: React.ReactNode;
}

export default function RoleLayout({ role, children }: RoleLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-secondary flex flex-col">
      <div className='absolute w-full h-[180px] 2xl:h-[190px] bg-primary rounded-bl-[100px]'></div>

      {/* Navbar */}
      <div className="relative px-6 pt-0">
        <Container>
          <RoleNavbar role={role} />
        </Container>
      </div>

      {/* Content */}
      <main className="relative flex-1 p-6 overflow-auto mt-7 flex flex-col">
        <Container className="flex-1 flex flex-col">{children}</Container>
      </main>

      {/* Footer */}
      <footer className="relative py-4 text-center text-white text-sm font-medium tracking-widest" style={{ backgroundColor: '#0776BC' }}>
        College of Computing Khon Kaen University
      </footer>
    </div>
  );
}
