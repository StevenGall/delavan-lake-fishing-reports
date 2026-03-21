import { clsx } from 'clsx';

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ value, label, icon, className }: StatCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-gradient-to-br from-lake-600 to-lake-800 p-5 text-white shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-lake-200">{label}</p>
        </div>
        {icon && <span className="text-2xl opacity-80">{icon}</span>}
      </div>
    </div>
  );
}
