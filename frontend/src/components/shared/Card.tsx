import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Card({ title, children, className = '', action }: CardProps) {
  return (
    <div className={`bg-bg-secondary border border-border rounded-xl ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
