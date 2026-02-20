'use client';

interface BodyWrapperProps {
  children: React.ReactNode;
  className: string;
}

export default function BodyWrapper({ children, className }: BodyWrapperProps) {
  return (
    <body className={className} onContextMenu={(e) => e.preventDefault()}>
      {children}
    </body>
  );
}
