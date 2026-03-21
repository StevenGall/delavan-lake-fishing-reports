import { useState } from 'react';
import { useSearchReports, useSpecies } from '../hooks/useQueries';
import { Modal } from './ui/Modal';
import { LoadingState } from './ui/LoadingState';
import { Badge } from './ui/Badge';
import type { FishingReport, SearchFilters } from '../types';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const SEASONS = ['winter', 'spring', 'summer', 'fall'];
const WEATHER_OPTIONS = ['sunny', 'cloudy', 'partly cloudy', 'rainy', 'snowy', 'clear', 'overcast'];

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function NA() {
  return <span className="italic text-gray-400 dark:text-gray-500">N/A</span>;
}

export function ReportsTable() {
  const [selectedReport, setSelectedReport] = useState<FishingReport | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    month: new Date().getMonth() + 1,
  });

  const { data: species = [] } = useSpecies();
  const { data: reports = [], isLoading, error } = useSearchReports(filters);

  const handleFilterChange = (key: keyof SearchFilters, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => setFilters({});

  const selectClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-lake-500 focus:ring-1 focus:ring-lake-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200';
  const inputClass = selectClass;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Filters Panel */}
      <div className="w-full shrink-0 lg:sticky lg:top-20 lg:w-72 lg:self-start">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Filter Reports
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Month</label>
              <select className={selectClass} value={filters.month || ''} onChange={(e) => handleFilterChange('month', e.target.value ? parseInt(e.target.value) : undefined)}>
                <option value="">All Months</option>
                {MONTHS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Season</label>
              <select className={selectClass} value={filters.season || ''} onChange={(e) => handleFilterChange('season', e.target.value)}>
                <option value="">All Seasons</option>
                {SEASONS.map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Species</label>
              <select className={selectClass} value={filters.species || ''} onChange={(e) => handleFilterChange('species', e.target.value)}>
                <option value="">All Species</option>
                {species.slice(0, 20).map((s) => (<option key={s.species} value={s.species}>{s.species} ({s.count})</option>))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Weather</label>
              <select className={selectClass} value={filters.weather || ''} onChange={(e) => handleFilterChange('weather', e.target.value)}>
                <option value="">All Weather</option>
                {WEATHER_OPTIONS.map((w) => (<option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Location</label>
              <input className={inputClass} type="text" placeholder="Search location..." value={filters.location || ''} onChange={(e) => handleFilterChange('location', e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Depth Range (ft)</label>
              <div className="flex items-center gap-2">
                <input className={inputClass} type="number" placeholder="Min" value={filters.minDepth || ''} onChange={(e) => handleFilterChange('minDepth', e.target.value ? parseFloat(e.target.value) : undefined)} />
                <span className="text-gray-400">to</span>
                <input className={inputClass} type="number" placeholder="Max" value={filters.maxDepth || ''} onChange={(e) => handleFilterChange('maxDepth', e.target.value ? parseFloat(e.target.value) : undefined)} />
              </div>
            </div>
          </div>

          <button
            onClick={clearFilters}
            className="mt-5 w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Reports Panel */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Fishing Reports</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{reports.length} reports found</span>
        </div>

        {isLoading && <LoadingState count={5} />}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            Failed to load reports. Make sure the API server is running.
          </div>
        )}

        {!isLoading && !error && reports.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400">
            No reports found matching your filters.
          </div>
        )}

        {!isLoading && !error && reports.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  {['Date', 'Species', 'Location', 'Depth', 'Bait/Lure', 'Weather', 'Water Temp'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="cursor-pointer bg-white transition-colors hover:bg-lake-50 dark:bg-gray-800 dark:hover:bg-lake-900/20"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300">{formatDate(report.date_posted)}</td>
                    <td className="px-4 py-3">{report.species_caught ? <Badge variant="species">{report.species_caught}</Badge> : <NA />}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{report.location || <NA />}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{report.water_depth_feet ? `${report.water_depth_feet} ft` : <NA />}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{report.bait_lure || <NA />}</td>
                    <td className="px-4 py-3">{report.weather_conditions ? <Badge variant="weather">{report.weather_conditions}</Badge> : <NA />}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{report.water_temp_f ? `${report.water_temp_f}°F` : <NA />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <Modal title="Report Details" onClose={() => setSelectedReport(null)}>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Date', formatDate(selectedReport.date_posted)],
              ['User', selectedReport.username || 'Unknown'],
              ['Species Caught', selectedReport.species_caught || 'N/A'],
              ['Species Targeted', selectedReport.species_targeted || 'N/A'],
              ['Location', selectedReport.location || 'N/A'],
              ['Water Depth', selectedReport.water_depth_feet ? `${selectedReport.water_depth_feet} ft` : 'N/A'],
              ['Bait/Lure', selectedReport.bait_lure || 'N/A'],
              ['Weather', selectedReport.weather_conditions || 'N/A'],
              ['Water Temp', selectedReport.water_temp_f ? `${selectedReport.water_temp_f}°F` : 'N/A'],
              ['Air Temp', selectedReport.air_temp_f ? `${selectedReport.air_temp_f}°F` : 'N/A'],
              ...(selectedReport.ice_thickness_inches ? [['Ice Thickness', `${selectedReport.ice_thickness_inches}"`]] : []),
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-0.5 font-medium text-gray-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>

          {selectedReport.notes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</p>
              <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedReport.notes}</p>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Original Report</p>
            <p className="mt-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
              {selectedReport.raw_content}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
