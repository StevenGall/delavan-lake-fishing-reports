import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'species' | 'season' | 'weather' | 'success' | 'warning';
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  species: 'bg-lake-100 text-lake-700 dark:bg-lake-900 dark:text-lake-300',
  season: 'bg-forest-500/10 text-forest-500 dark:bg-forest-500/20 dark:text-forest-400',
  weather: 'bg-sand-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-catch-gold/10 text-catch-gold dark:bg-catch-gold/20',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
