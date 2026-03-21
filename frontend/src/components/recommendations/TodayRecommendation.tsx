import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTodayRecommendations } from '../../hooks/useQueries';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import type { TodayRecommendation as TodayRec } from '../../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {value}%
      </span>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: TodayRec }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded((p) => !p)}
      className="w-full text-left"
    >
      <Card
        className={`transition-all hover:shadow-md ${
          expanded
            ? 'border-lake-500 ring-1 ring-lake-500/30 dark:border-lake-400'
            : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {rec.species}
              </h3>
              {rec.is_ice_fishing_month && (
                <Badge variant="weather">Ice Fishing</Badge>
              )}
            </div>
            <ConfidenceBar value={rec.confidence} />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {rec.report_count_this_month} reports
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {rec.years_with_catches}/{rec.total_years_data} years
            </p>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-4 dark:border-gray-700">
            {rec.best_zone && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Best Zone
                </p>
                <Link
                  to={`/map`}
                  className="text-sm font-semibold text-lake-600 hover:underline dark:text-lake-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {rec.best_zone.name}
                </Link>
              </div>
            )}
            {rec.best_bait && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Best Bait
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {rec.best_bait}
                </p>
              </div>
            )}
            {rec.target_depth != null && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Target Depth
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {rec.target_depth}ft
                </p>
              </div>
            )}
            {rec.historical_water_temp && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Water Temp
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {rec.historical_water_temp.avg}°F
                </p>
                <p className="text-[10px] text-gray-400">
                  {rec.historical_water_temp.min}–{rec.historical_water_temp.max}°F range
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </button>
  );
}

export function TodayRecommendation() {
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { data, isLoading } = useTodayRecommendations(selectedMonth);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            What Should I Fish{selectedMonth === currentMonth ? ' Today' : ''}?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data?.month_name || MONTH_NAMES[selectedMonth - 1]} fishing on
            Delavan Lake — ranked by confidence
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
              {i + 1 === currentMonth ? ' (now)' : ''}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingState count={3} />
      ) : !data?.recommendations.length ? (
        <Card className="py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No recommendation data for {MONTH_NAMES[selectedMonth - 1]}.
            <br />
            <span className="text-sm">
              Make sure the database is populated with fishing reports.
            </span>
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.recommendations.map((rec, i) => (
            <RecommendationCard key={`${rec.species}-${i}`} rec={rec} />
          ))}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Click a species for details. Confidence based on {data.recommendations[0]?.total_years_data || 0} years of
            historical data.
          </p>
        </div>
      )}
    </div>
  );
}
