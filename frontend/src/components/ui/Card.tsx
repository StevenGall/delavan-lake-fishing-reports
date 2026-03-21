import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'gradient';
  className?: string;
  onClick?: () => void;
}

export function Card({ children, variant = 'default', className, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-5',
        variant === 'default' && 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        variant === 'elevated' && 'border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800',
        variant === 'gradient' && 'border-0 bg-gradient-to-br from-lake-600 to-lake-800 text-white',
        onClick && 'cursor-pointer transition-shadow hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
