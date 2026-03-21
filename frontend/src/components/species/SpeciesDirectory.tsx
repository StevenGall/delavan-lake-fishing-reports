import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSpecies } from '../../hooks/useQueries';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

type SortKey = 'count' | 'name';

export function SpeciesDirectory() {
  const { data: species = [], isLoading, error } = useSpecies();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('count');

  const filtered = useMemo(() => {
    let list = species;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.species.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) =>
      sortBy === 'count'
        ? b.count - a.count
        : a.species.localeCompare(b.species)
    );
  }, [species, search, sortBy]);

  const maxCount = species.length > 0 ? species[0].count : 1;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load species data. Make sure the API server is running.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Species Directory
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {species.length} species recorded across {species.reduce((sum, s) => sum + s.count, 0).toLocaleString()} reports
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search species..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm text-gray-900 focus:border-lake-500 focus:ring-1 focus:ring-lake-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-lake-400"
          />
          <svg
            className="absolute top-2.5 left-3 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('count')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              sortBy === 'count'
                ? 'bg-lake-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Most Reports
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              sortBy === 'name'
                ? 'bg-lake-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* Species Grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          No species found matching "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sp) => (
            <Link
              key={sp.species}
              to={`/species/${encodeURIComponent(sp.species)}`}
            >
              <Card className="group h-full transition-all hover:shadow-md hover:border-lake-300 dark:hover:border-lake-600">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-gray-900 group-hover:text-lake-600 dark:text-white dark:group-hover:text-lake-400">
                      {sp.species}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {sp.count.toLocaleString()} reports
                    </p>
                  </div>
                  <Badge variant="species">{sp.count.toLocaleString()}</Badge>
                </div>

                {/* Relative popularity bar */}
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-lake-500 transition-all dark:bg-lake-400"
                      style={{ width: `${(sp.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center text-xs text-gray-400 dark:text-gray-500">
                  <span>View profile</span>
                  <svg
                    className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
