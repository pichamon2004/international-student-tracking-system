import RoleNavbar from './RoleNavbar';
import Container from '@/components/ui/Container';

interface RoleLayoutProps {
  role?: 'student' | 'advisor' | 'staff' | 'dean';
  children: React.ReactNode;
}

export default function RoleLayout({ role, children }: RoleLayoutProps) {
  return (
    <div className="relative h-screen overflow-hidden bg-secondary flex flex-col">
      <div className='absolute w-full h-[180px] 2xl:h-[190px] bg-primary rounded-bl-[100px]'></div>

      {/* Navbar */}
      <div className="relative px-3 md:px-6 pt-0">
        <Container>
          <RoleNavbar role={role} />
        </Container>
      </div>

      {/* Content */}
      {/* The bottom gap is a spacer after the page, not main's padding: a page taller
          than the viewport overflows the height-capped Container, and a scroll container's
          padding only follows its child's box, so the gap would vanish when scrolled. */}
      <main className="relative flex-1 min-h-0 px-3 md:px-6 pt-6 overflow-auto mt-7 flex flex-col">
        {/* Pages fill the viewport height (and scroll inside their own panels), but never
            get squeezed below 600px — on a short screen (a phone held sideways) the page
            keeps a usable height and main scrolls instead. */}
        <Container className="flex-1 min-h-[600px] flex flex-col after:block after:shrink-0 after:h-6">{children}</Container>
      </main>

      {/* Footer */}
      <footer className="relative py-4 text-center text-white text-sm font-medium tracking-widest" style={{ backgroundColor: '#0776BC' }}>
        College of Computing Khon Kaen University
      </footer>
    </div>
  );
}
