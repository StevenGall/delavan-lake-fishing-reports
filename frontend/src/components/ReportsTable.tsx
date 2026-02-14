import { useEffect, useState } from 'react';
import { searchReports, getAllSpecies } from '../api';
import type { FishingReport, SearchFilters, SpeciesCount } from '../types';
import './ReportsTable.css';

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

export function ReportsTable() {
  const [reports, setReports] = useState<FishingReport[]>([]);
  const [species, setSpecies] = useState<SpeciesCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<FishingReport | null>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    month: new Date().getMonth() + 1,
  });

  useEffect(() => {
    getAllSpecies().then(setSpecies).catch(console.error);
  }, []);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        setError(null);
        const data = await searchReports(filters);
        setReports(data);
      } catch (err) {
        setError('Failed to load reports. Make sure the API server is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: string | number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const formatDate = (dateStr: string | null) => {
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
  };

  return (
    <div className="reports-container">
      <div className="filters-panel">
        <h2>Filter Reports</h2>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Month</label>
            <select
              value={filters.month || ''}
              onChange={(e) => handleFilterChange('month', e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">All Months</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Season</label>
            <select
              value={filters.season || ''}
              onChange={(e) => handleFilterChange('season', e.target.value)}
            >
              <option value="">All Seasons</option>
              {SEASONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Species</label>
            <select
              value={filters.species || ''}
              onChange={(e) => handleFilterChange('species', e.target.value)}
            >
              <option value="">All Species</option>
              {species.slice(0, 20).map((s) => (
                <option key={s.species} value={s.species}>
                  {s.species} ({s.count})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Weather</label>
            <select
              value={filters.weather || ''}
              onChange={(e) => handleFilterChange('weather', e.target.value)}
            >
              <option value="">All Weather</option>
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w.charAt(0).toUpperCase() + w.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Location</label>
            <input
              type="text"
              placeholder="Search location..."
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Depth Range (ft)</label>
            <div className="depth-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minDepth || ''}
                onChange={(e) => handleFilterChange('minDepth', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxDepth || ''}
                onChange={(e) => handleFilterChange('maxDepth', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        <button className="clear-filters-btn" onClick={clearFilters}>
          Clear All Filters
        </button>
      </div>

      <div className="reports-panel">
        <div className="reports-header">
          <h2>Fishing Reports</h2>
          <span className="report-count">{reports.length} reports found</span>
        </div>

        {loading && <div className="loading">Loading reports...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && reports.length === 0 && (
          <div className="no-results">No reports found matching your filters.</div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Species</th>
                  <th>Location</th>
                  <th>Depth</th>
                  <th>Bait/Lure</th>
                  <th>Weather</th>
                  <th>Water Temp</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={selectedReport?.id === report.id ? 'selected' : ''}
                  >
                    <td>{formatDate(report.date_posted)}</td>
                    <td className="species-cell">
                      {report.species_caught || <span className="na">N/A</span>}
                    </td>
                    <td>{report.location || <span className="na">N/A</span>}</td>
                    <td>
                      {report.water_depth_feet ? `${report.water_depth_feet} ft` : <span className="na">N/A</span>}
                    </td>
                    <td>{report.bait_lure || <span className="na">N/A</span>}</td>
                    <td>{report.weather_conditions || <span className="na">N/A</span>}</td>
                    <td>
                      {report.water_temp_f ? `${report.water_temp_f}°F` : <span className="na">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReport && (
        <div className="report-detail-overlay" onClick={() => setSelectedReport(null)}>
          <div className="report-detail" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedReport(null)}>
              &times;
            </button>
            <h3>Report Details</h3>

            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span>{formatDate(selectedReport.date_posted)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">User:</span>
                <span>{selectedReport.username || 'Unknown'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Species Caught:</span>
                <span>{selectedReport.species_caught || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Species Targeted:</span>
                <span>{selectedReport.species_targeted || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Location:</span>
                <span>{selectedReport.location || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Water Depth:</span>
                <span>{selectedReport.water_depth_feet ? `${selectedReport.water_depth_feet} ft` : 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Bait/Lure:</span>
                <span>{selectedReport.bait_lure || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Weather:</span>
                <span>{selectedReport.weather_conditions || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Water Temp:</span>
                <span>{selectedReport.water_temp_f ? `${selectedReport.water_temp_f}°F` : 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Air Temp:</span>
                <span>{selectedReport.air_temp_f ? `${selectedReport.air_temp_f}°F` : 'N/A'}</span>
              </div>
              {selectedReport.ice_thickness_inches && (
                <div className="detail-row">
                  <span className="detail-label">Ice Thickness:</span>
                  <span>{selectedReport.ice_thickness_inches}"</span>
                </div>
              )}
            </div>

            {selectedReport.notes && (
              <div className="detail-notes">
                <span className="detail-label">Notes:</span>
                <p>{selectedReport.notes}</p>
              </div>
            )}

            <div className="raw-content">
              <span className="detail-label">Original Report:</span>
              <p>{selectedReport.raw_content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
