import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/Dashboard';
import { ReportsTable } from './components/ReportsTable';
import { InteractiveLakeMap } from './components/map/InteractiveLakeMap';
import { SpeciesDirectory } from './components/species/SpeciesDirectory';
import { SpeciesProfile } from './components/species/SpeciesProfile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function CalendarPlaceholder() {
  return (
    <div className="flex h-96 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center">
        <p className="text-4xl">📅</p>
        <p className="mt-2 text-lg font-medium text-gray-600 dark:text-gray-400">
          Seasonal Calendar
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Coming in Phase 5</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="map" element={<InteractiveLakeMap />} />
            <Route path="reports" element={<ReportsTable />} />
            <Route path="species" element={<SpeciesDirectory />} />
            <Route path="species/:name" element={<SpeciesProfile />} />
            <Route path="calendar" element={<CalendarPlaceholder />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
