interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`sm:max-w-[80vw] mx-auto w-full ${className}`}>
      {children}
    </div>
  );
}
