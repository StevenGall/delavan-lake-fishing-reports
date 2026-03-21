import type { SpeciesCount } from '../../types';

interface MapControlsProps {
  species: SpeciesCount[];
  selectedSpecies: string;
  selectedMonth: number | null;
  onSpeciesChange: (species: string) => void;
  onMonthChange: (month: number | null) => void;
  showContours: boolean;
  showLandmarks: boolean;
  showVegetation: boolean;
  showHazards: boolean;
  onToggleContours: () => void;
  onToggleLandmarks: () => void;
  onToggleVegetation: () => void;
  onToggleHazards: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function MapControls({
  species,
  selectedSpecies,
  selectedMonth,
  onSpeciesChange,
  onMonthChange,
  showContours,
  showLandmarks,
  showVegetation,
  showHazards,
  onToggleContours,
  onToggleLandmarks,
  onToggleVegetation,
  onToggleHazards,
}: MapControlsProps) {
  const selectClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-lake-500 focus:ring-1 focus:ring-lake-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200';

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Species filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Species</label>
        <select
          className={selectClass}
          value={selectedSpecies}
          onChange={(e) => onSpeciesChange(e.target.value)}
        >
          <option value="">All Species</option>
          {species.slice(0, 20).map((s) => (
            <option key={s.species} value={s.species}>
              {s.species} ({s.count})
            </option>
          ))}
        </select>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Month</label>
        <select
          className={selectClass}
          value={selectedMonth ?? ''}
          onChange={(e) => onMonthChange(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">All Months</option>
          {MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="hidden h-8 w-px bg-gray-200 sm:block dark:bg-gray-600" />

      {/* Layer toggles */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Contours', checked: showContours, onToggle: onToggleContours },
          { label: 'Landmarks', checked: showLandmarks, onToggle: onToggleLandmarks },
          { label: 'Vegetation', checked: showVegetation, onToggle: onToggleVegetation },
          { label: 'Hazards', checked: showHazards, onToggle: onToggleHazards },
        ].map(({ label, checked, onToggle }) => (
          <label key={label} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={checked}
              onChange={onToggle}
              className="rounded border-gray-300 text-lake-600 focus:ring-lake-500"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
