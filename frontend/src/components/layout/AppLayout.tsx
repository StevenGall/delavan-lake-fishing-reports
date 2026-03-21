import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { useTheme } from '../../hooks/useTheme';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/map', label: 'Map' },
  { to: '/reports', label: 'Reports' },
  { to: '/species', label: 'Species' },
  { to: '/calendar', label: 'Calendar' },
];

export function AppLayout() {
  const { isDark, toggle } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-lake-800 to-lake-600 shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-4 py-3 sm:flex-row sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl">🎣</span>
            <span className="text-lg font-semibold tracking-tight">Delavan Lake Fishing</span>
          </NavLink>

          <div className="mt-2 flex items-center gap-1 sm:mt-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={toggle}
              className="ml-2 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Toggle dark mode"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-lake-900 py-4 text-center text-sm text-lake-300">
        Data sourced from{' '}
        <a
          href="https://www.lake-link.com/wisconsin-fishing-reports/delavan-lake-walworth-county/4470/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lake-200 underline-offset-2 hover:underline"
        >
          Lake-Link.com
        </a>
      </footer>
    </div>
  );
}
