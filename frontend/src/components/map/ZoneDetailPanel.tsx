import { useZoneStats } from '../../hooks/useQueries';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';

interface ZoneDetailPanelProps {
  zoneId: string;
  onClose: () => void;
}

export function ZoneDetailPanel({ zoneId, onClose }: ZoneDetailPanelProps) {
  const { data, isLoading } = useZoneStats(zoneId);

  return (
    <div className="w-full shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:w-80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {data?.zone.name || zoneId}
        </h3>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
        >
          &times;
        </button>
      </div>

      {isLoading ? (
        <div className="p-4">
          <LoadingState count={3} />
        </div>
      ) : data ? (
        <div className="space-y-4 p-4">
          {/* Zone info */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{data.zone.description}</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="species">
                {data.zone.report_count} reports
              </Badge>
              <Badge variant="default">
                {data.zone.typical_depth_min}-{data.zone.typical_depth_max}ft
              </Badge>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Depth</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {data.avg_depth ? `${data.avg_depth}ft` : 'N/A'}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Water Temp</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {data.avg_water_temp ? `${data.avg_water_temp}°F` : 'N/A'}
              </p>
            </Card>
          </div>

          {/* Species breakdown */}
          {data.species_breakdown.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Species Caught Here
              </h4>
              <div className="space-y-1.5">
                {data.species_breakdown.slice(0, 8).map((s) => (
                  <div key={s.species} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{s.species}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                        <div
                          className="h-full rounded-full bg-lake-500"
                          style={{
                            width: `${(s.count / data.species_breakdown[0].count) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-gray-500 dark:text-gray-400">
                        {s.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top baits */}
          {data.top_baits.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Best Baits & Lures
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.top_baits.slice(0, 6).map((b) => (
                  <Badge key={b.bait} variant="weather">
                    {b.bait} ({b.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Monthly activity mini-chart */}
          {data.monthly_distribution.some((m) => m.count > 0) && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Monthly Activity
              </h4>
              <div className="flex h-16 items-end gap-0.5">
                {data.monthly_distribution.map((m) => {
                  const maxCount = Math.max(...data.monthly_distribution.map((x) => x.count), 1);
                  return (
                    <div
                      key={m.month}
                      className="group relative flex-1"
                      title={`Month ${m.month}: ${m.count} reports`}
                    >
                      <div
                        className="w-full rounded-t bg-lake-500 transition-colors group-hover:bg-lake-400"
                        style={{ height: `${(m.count / maxCount) * 100}%`, minHeight: m.count > 0 ? '2px' : '0' }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[8px] text-gray-400">
                <span>Jan</span>
                <span>Jun</span>
                <span>Dec</span>
              </div>
            </div>
          )}

          {/* Recent reports */}
          {data.recent_reports.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Recent Reports
              </h4>
              <div className="space-y-2">
                {data.recent_reports.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg bg-gray-50 p-2.5 text-sm dark:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {r.species_caught || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {r.date_posted
                          ? new Date(r.date_posted).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    {r.bait_lure && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Bait: {r.bait_lure}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No data available for this zone.
        </div>
      )}
    </div>
  );
}
