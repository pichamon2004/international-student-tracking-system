interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`max-w-[90rem] mx-auto w-full ${className}`}>
      {children}
    </div>
  );
}
