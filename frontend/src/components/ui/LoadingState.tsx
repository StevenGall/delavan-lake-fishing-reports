import { clsx } from 'clsx';

interface LoadingStateProps {
  className?: string;
  count?: number;
}

export function LoadingState({ className, count = 3 }: LoadingStateProps) {
  return (
    <div className={clsx('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse rounded-xl border border-gray-200 p-5 dark:border-gray-700', className)}>
      <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-3 h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
