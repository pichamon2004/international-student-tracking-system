interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`md:max-w-[90vw] 2xl:max-w-[80vw] mx-auto w-full ${className}`}>
      {children}
    </div>
  );
}
