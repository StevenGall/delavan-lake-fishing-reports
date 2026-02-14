import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ReportsTable } from './components/ReportsTable';
import { MapView } from './components/MapView';
import './App.css';

type View = 'dashboard' | 'reports' | 'map';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-icon">🎣</span>
          <span className="brand-text">Delavan Lake Fishing</span>
        </div>
        <div className="nav-links">
          <button
            className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${currentView === 'reports' ? 'active' : ''}`}
            onClick={() => setCurrentView('reports')}
          >
            Reports
          </button>
          <button
            className={`nav-link ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => setCurrentView('map')}
          >
            Map
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'reports' && <ReportsTable />}
        {currentView === 'map' && <MapView />}
      </main>

      <footer className="footer">
        <p>
          Data sourced from{' '}
          <a href="https://www.lake-link.com/wisconsin-fishing-reports/delavan-lake-walworth-county/4470/" target="_blank" rel="noopener noreferrer">
            Lake-Link.com
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
