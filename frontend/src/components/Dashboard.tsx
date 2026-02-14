import { useEffect, useState } from 'react';
import { getStats, getMonthlyStats, getAllSpecies } from '../api';
import type { Stats, MonthlyStat, SpeciesCount } from '../types';
import './Dashboard.css';

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [species, setSpecies] = useState<SpeciesCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [statsData, monthlyData, speciesData] = await Promise.all([
          getStats(),
          getMonthlyStats(),
          getAllSpecies(),
        ]);
        setStats(statsData);
        setMonthlyStats(monthlyData);
        setSpecies(speciesData);
      } catch (err) {
        setError('Failed to load dashboard data. Make sure the API server is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  const currentMonth = new Date().getMonth() + 1;
  const currentMonthStats = monthlyStats.find((m) => m.month === currentMonth);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Delavan Lake Fishing Reports</h1>
        <p className="subtitle">Historical fishing data and recommendations</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{stats?.raw_reports.toLocaleString() || 0}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.processed_reports.toLocaleString() || 0}</div>
          <div className="stat-label">Processed Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{species.length}</div>
          <div className="stat-label">Species Recorded</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{currentMonthStats?.report_count || 0}</div>
          <div className="stat-label">Reports This Month</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Top Species</h2>
          <div className="species-list">
            {species.slice(0, 10).map((s, index) => (
              <div key={s.species} className="species-item">
                <span className="species-rank">#{index + 1}</span>
                <span className="species-name">{s.species}</span>
                <span className="species-count">{s.count} reports</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Monthly Overview</h2>
          <div className="monthly-chart">
            {monthlyStats.map((m) => (
              <div
                key={m.month}
                className={`month-bar ${m.month === currentMonth ? 'current' : ''}`}
              >
                <div
                  className="bar-fill"
                  style={{
                    height: `${Math.min(100, (m.report_count / Math.max(...monthlyStats.map((x) => x.report_count))) * 100)}%`,
                  }}
                />
                <span className="month-label">{m.month_name.slice(0, 3)}</span>
                <span className="month-count">{m.report_count}</span>
              </div>
            ))}
          </div>
        </div>

        {currentMonthStats && (
          <div className="dashboard-section current-month">
            <h2>{currentMonthStats.month_name} Fishing</h2>
            <div className="month-details">
              <div className="detail-item">
                <span className="detail-label">Avg Water Temp</span>
                <span className="detail-value">
                  {currentMonthStats.avg_water_temp
                    ? `${currentMonthStats.avg_water_temp}°F`
                    : 'N/A'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Avg Air Temp</span>
                <span className="detail-value">
                  {currentMonthStats.avg_air_temp
                    ? `${currentMonthStats.avg_air_temp}°F`
                    : 'N/A'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Top Species</span>
                <span className="detail-value">
                  {currentMonthStats.top_species.slice(0, 3).join(', ') || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
