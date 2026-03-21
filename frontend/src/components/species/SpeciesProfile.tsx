import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useSpeciesProfile } from '../../hooks/useQueries';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const SEASON_COLORS: Record<string, string> = {
  Winter: '#60a5fa',
  Spring: '#4ade80',
  Summer: '#fbbf24',
  Fall: '#f97316',
};

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export function SpeciesProfile() {
  const { name } = useParams<{ name: string }>();
  const decodedName = name ? decodeURIComponent(name) : '';
  const { data: profile, isLoading, error } = useSpeciesProfile(decodedName || null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingState count={5} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <Link
          to="/species"
          className="inline-flex items-center text-sm text-lake-600 hover:text-lake-700 dark:text-lake-400"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Species
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error ? 'Failed to load species data.' : `No data found for "${decodedName}".`}
        </div>
      </div>
    );
  }

  const peakMonthName = profile.peak_month
    ? MONTH_NAMES[profile.peak_month - 1]
    : 'N/A';

  const monthlyData = profile.monthly_distribution.map((m) => ({
    ...m,
    name: MONTH_NAMES[m.month - 1],
    isPeak: m.month === profile.peak_month,
  }));

  const hasDepthData = profile.avg_depth !== null;
  const hasZoneData = profile.top_zones.length > 0;
  const hasBaitData = profile.top_baits.length > 0;
  const hasYearlyData = profile.yearly_trend.length > 1;
  const hasSeasonDepth = profile.depth_by_season.length > 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        to="/species"
        className="inline-flex items-center text-sm text-lake-600 hover:text-lake-700 dark:text-lake-400"
      >
        <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Species
      </Link>

      {/* Section 1: Overview */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          {profile.species}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Comprehensive fishing profile based on {profile.total_reports.toLocaleString()} reports
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBadge label="Total Reports" value={profile.total_reports.toLocaleString()} />
        <StatBadge label="Peak Month" value={peakMonthName} />
        <StatBadge
          label="Avg Depth"
          value={hasDepthData ? `${profile.avg_depth} ft` : 'N/A'}
        />
        <StatBadge
          label="Depth Range"
          value={
            profile.depth_range
              ? `${profile.depth_range.min}–${profile.depth_range.max} ft`
              : 'N/A'
          }
        />
      </div>

      {/* Section 2: When to Fish */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          When to Fish
        </h2>

        {/* Monthly Distribution */}
        <h3 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          Monthly Catch Distribution
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-gray-800, #1f2937)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [`${value} reports`, 'Count']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={entry.isPeak ? '#f59e0b' : '#2b7cb8'}
                    opacity={entry.isPeak ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Year-over-Year Trend */}
        {hasYearlyData && (
          <>
            <h3 className="mb-2 mt-6 text-sm font-medium text-gray-600 dark:text-gray-400">
              Year-over-Year Trend
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={profile.yearly_trend}
                  margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-gray-800, #1f2937)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                    formatter={(value: number) => [`${value} reports`, 'Count']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2b7cb8"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#2b7cb8' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      {/* Section 3: Where to Fish */}
      {hasZoneData && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Where to Fish
          </h2>
          <div className="space-y-2">
            {profile.top_zones.map((zone, i) => {
              const maxZoneCount = profile.top_zones[0].count;
              return (
                <div key={zone.zone_id} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-right text-sm font-medium text-gray-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/map?zone=${zone.zone_id}`}
                        className="truncate text-sm font-medium text-gray-900 hover:text-lake-600 dark:text-white dark:hover:text-lake-400"
                      >
                        {zone.name}
                      </Link>
                      <span className="ml-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {zone.count} reports
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-lake-500 dark:bg-lake-400"
                        style={{ width: `${(zone.count / maxZoneCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Section 4: How to Fish */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bait Effectiveness */}
        {hasBaitData && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Top Baits & Lures
            </h2>
            <div className="space-y-2">
              {profile.top_baits.map((bait, i) => {
                const maxBaitCount = profile.top_baits[0].count;
                return (
                  <div key={bait.bait} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-right text-sm font-medium text-gray-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {bait.bait}
                        </span>
                        <span className="ml-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {bait.count}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-catch-gold"
                          style={{ width: `${(bait.count / maxBaitCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Depth by Season */}
        {hasSeasonDepth && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Depth by Season
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={profile.depth_by_season}
                  margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="season" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{
                      value: 'Avg Depth (ft)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 11, fill: '#9ca3af' },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-gray-800, #1f2937)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                    formatter={(value: number) => [`${value} ft`, 'Avg Depth']}
                  />
                  <Bar dataKey="avg_depth" radius={[4, 4, 0, 0]}>
                    {profile.depth_by_season.map((entry) => (
                      <Cell
                        key={entry.season}
                        fill={SEASON_COLORS[entry.season] || '#2b7cb8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Section 5: Associated Species */}
      {profile.associated_species.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Commonly Caught Together
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.associated_species.map((assoc) => (
              <Link
                key={assoc.species}
                to={`/species/${encodeURIComponent(assoc.species)}`}
              >
                <Badge
                  variant="species"
                  className="cursor-pointer transition-colors hover:bg-lake-200 dark:hover:bg-lake-800"
                >
                  {assoc.species}
                  <span className="ml-1 opacity-60">({assoc.co_occurrence_count})</span>
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
