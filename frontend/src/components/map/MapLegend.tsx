import { clsx } from 'clsx';

interface MapLegendProps {
  mode: 'depth' | 'heatmap';
  className?: string;
}

const DEPTH_STOPS = [
  { label: '5ft', color: '#bfdbfe' },
  { label: '10ft', color: '#93c5fd' },
  { label: '15ft', color: '#60a5fa' },
  { label: '20ft', color: '#3b82f6' },
  { label: '25ft', color: '#2563eb' },
  { label: '30ft', color: '#1d4ed8' },
  { label: '35ft', color: '#1e40af' },
  { label: '40ft', color: '#1e3a8a' },
  { label: '45ft', color: '#172554' },
  { label: '50ft', color: '#0f172a' },
];

const HEATMAP_STOPS = [
  { label: 'Low', color: '#dbeafe' },
  { label: '', color: '#93c5fd' },
  { label: 'Medium', color: '#3b82f6' },
  { label: '', color: '#f59e0b' },
  { label: 'High', color: '#dc2626' },
];

export function MapLegend({ mode, className }: MapLegendProps) {
  const stops = mode === 'depth' ? DEPTH_STOPS : HEATMAP_STOPS;

  return (
    <div className={clsx('rounded-lg border border-gray-200 bg-white/90 p-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90', className)}>
      <p className="mb-2 text-xs font-semibold text-gray-600 uppercase dark:text-gray-400">
        {mode === 'depth' ? 'Depth' : 'Report Density'}
      </p>
      <div className="flex items-center gap-0.5">
        {stops.map((stop, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="h-3 w-6 first:rounded-l last:rounded-r"
              style={{ backgroundColor: stop.color }}
            />
            {stop.label && (
              <span className="mt-1 text-[9px] text-gray-500 dark:text-gray-400">{stop.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
