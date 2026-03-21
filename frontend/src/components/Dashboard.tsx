import { useStats, useMonthlyStats, useSpecies } from '../hooks/useQueries';
import { StatCard } from './ui/StatCard';
import { Card } from './ui/Card';
import { LoadingState } from './ui/LoadingState';
import { TodayRecommendation } from './recommendations/TodayRecommendation';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useStats();
  const { data: monthlyStats = [], isLoading: monthlyLoading } = useMonthlyStats();
  const { data: species = [], isLoading: speciesLoading } = useSpecies();

  const loading = statsLoading || monthlyLoading || speciesLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState count={4} />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load dashboard data. Make sure the API server is running.
      </div>
    );
  }

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthStats = monthlyStats.find((m) => m.month === currentMonth);
  const maxReportCount = Math.max(...monthlyStats.map((x) => x.report_count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Delavan Lake Fishing Reports
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Historical fishing data and recommendations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          value={stats?.raw_reports.toLocaleString() || '0'}
          label="Total Reports"
          icon="📊"
        />
        <StatCard
          value={stats?.processed_reports.toLocaleString() || '0'}
          label="Processed Reports"
          icon="✅"
        />
        <StatCard
          value={species.length.toString()}
          label="Species Recorded"
          icon="🐟"
        />
        <StatCard
          value={(currentMonthStats?.report_count || 0).toLocaleString()}
          label="Reports This Month"
          icon="📅"
        />
      </div>

      {/* Today's Recommendations */}
      <TodayRecommendation />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Species */}
        <Card variant="elevated">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Top Species
          </h2>
          <div className="space-y-2">
            {species.slice(0, 10).map((s, index) => (
              <div
                key={s.species}
                className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-100 text-xs font-bold text-lake-700 dark:bg-lake-900 dark:text-lake-300">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {s.species}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {s.count} reports
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Overview */}
        <Card variant="elevated">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Monthly Overview
          </h2>
          <div className="flex h-52 items-end gap-1.5">
            {monthlyStats.map((m) => {
              const height = (m.report_count / maxReportCount) * 100;
              const isCurrent = m.month === currentMonth;
              return (
                <div
                  key={m.month}
                  className="group flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-medium text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-400">
                    {m.report_count}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all group-hover:opacity-90 ${
                      isCurrent
                        ? 'bg-gradient-to-t from-forest-500 to-forest-400'
                        : 'bg-gradient-to-t from-lake-700 to-lake-500'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      isCurrent
                        ? 'text-forest-500 dark:text-forest-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {m.month_name.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Current Month Details */}
        {currentMonthStats && (
          <Card className="border-forest-500/30 bg-forest-500/5 lg:col-span-2 dark:bg-forest-500/10">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {currentMonthStats.month_name} Fishing
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white/80 p-4 dark:bg-gray-800/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Water Temp</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentMonthStats.avg_water_temp
                    ? `${currentMonthStats.avg_water_temp}°F`
                    : 'N/A'}
                </p>
              </div>
              <div className="rounded-lg bg-white/80 p-4 dark:bg-gray-800/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Air Temp</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentMonthStats.avg_air_temp
                    ? `${currentMonthStats.avg_air_temp}°F`
                    : 'N/A'}
                </p>
              </div>
              <div className="rounded-lg bg-white/80 p-4 dark:bg-gray-800/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">Top Species</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentMonthStats.top_species.slice(0, 3).join(', ') || 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
