import { useState, useRef, useEffect } from 'react';
import { useSpecies, useHeatmap, useZones } from '../../hooks/useQueries';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { ZoneDetailPanel } from './ZoneDetailPanel';
import { LoadingState } from '../ui/LoadingState';
// Import SVG as raw string — this is a trusted, build-time bundled local asset
import lakeSvgRaw from '../../assets/delavan-lake.svg?raw';

// Heatmap color interpolation: blue -> yellow -> red
function getHeatmapColor(intensity: number): string {
  if (intensity === 0) return 'transparent';
  if (intensity < 0.33) {
    const t = intensity / 0.33;
    const r = Math.round(59 + t * (6 - 59));
    const g = Math.round(130 + t * (182 - 130));
    const b = Math.round(246 + t * (212 - 246));
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  }
  if (intensity < 0.66) {
    const t = (intensity - 0.33) / 0.33;
    const r = Math.round(6 + t * (245 - 6));
    const g = Math.round(182 + t * (158 - 182));
    const b = Math.round(212 + t * (11 - 212));
    return `rgba(${r}, ${g}, ${b}, 0.55)`;
  }
  const t = (intensity - 0.66) / 0.34;
  const r = Math.round(245 + t * (220 - 245));
  const g = Math.round(158 + t * (38 - 158));
  const b = Math.round(11 + t * (38 - 11));
  return `rgba(${r}, ${g}, ${b}, 0.6)`;
}

/**
 * Injects a trusted SVG string into a container element.
 * SECURITY NOTE: The SVG content comes from a local asset file (delavan-lake.svg)
 * that is bundled at build time via Vite's ?raw import. It is NOT user-supplied content.
 */
function injectTrustedSvg(container: HTMLElement, svgContent: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = doc.documentElement;
  container.appendChild(container.ownerDocument.importNode(svgElement, true));
}

export function InteractiveLakeMap() {
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [showContours, setShowContours] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showVegetation, setShowVegetation] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const svgContainerRef = useRef<HTMLDivElement>(null);

  const { data: species = [] } = useSpecies();
  const { data: zones = [] } = useZones();
  const { data: heatmapData = [] } = useHeatmap({
    species: selectedSpecies || undefined,
    month: selectedMonth || undefined,
  });

  const hasHeatmap = selectedSpecies || selectedMonth;

  const heatmapMap = new Map(heatmapData.map((d) => [d.zone_id, d]));
  const zoneLookup = new Map(zones.map((z) => [z.zone_id, z]));

  // Inject the bundled SVG asset into the container on mount
  useEffect(() => {
    const container = svgContainerRef.current;
    if (container && !container.querySelector('svg')) {
      injectTrustedSvg(container, lakeSvgRaw);
    }
  }, []);

  // Sync SVG DOM with React state on every render
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    const toggleVisibility = (id: string, visible: boolean) => {
      const el = svgEl.getElementById(id) as HTMLElement | null;
      if (el) el.style.display = visible ? '' : 'none';
    };

    for (let i = 5; i <= 50; i += 5) {
      toggleVisibility(`contour-${i}`, showContours);
    }
    toggleVisibility('landmarks', showLandmarks);
    toggleVisibility('vegetation', showVegetation);
    toggleVisibility('hazards', showHazards);

    const zonesGroup = svgEl.getElementById('zones') as HTMLElement | null;
    if (zonesGroup) {
      zonesGroup.style.opacity = hasHeatmap ? '1' : '0';
      const zoneElements = zonesGroup.querySelectorAll('[data-zone]');
      zoneElements.forEach((el) => {
        const zoneId = el.getAttribute('data-zone');
        if (!zoneId) return;

        const hd = heatmapMap.get(zoneId);
        const htmlEl = el as SVGElement;

        if (hasHeatmap && hd) {
          htmlEl.style.fill = getHeatmapColor(hd.intensity);
          htmlEl.style.cursor = 'pointer';
        } else {
          htmlEl.style.fill = 'transparent';
          htmlEl.style.cursor = 'pointer';
        }

        if (zoneId === hoveredZone || zoneId === selectedZone) {
          htmlEl.style.stroke = '#f59e0b';
          htmlEl.style.strokeWidth = '3';
          if (htmlEl.style.fill === 'transparent') {
            htmlEl.style.fill = 'rgba(245, 158, 11, 0.15)';
          }
        } else {
          htmlEl.style.stroke = 'none';
          htmlEl.style.strokeWidth = '0';
        }

        // Clone element to replace old event listeners
        const newEl = htmlEl.cloneNode(true) as SVGElement;
        newEl.addEventListener('mouseenter', (e) => {
          setHoveredZone(zoneId);
          setTooltipPos({ x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY });
        });
        newEl.addEventListener('mouseleave', () => {
          setHoveredZone(null);
          setTooltipPos(null);
        });
        newEl.addEventListener('click', () => {
          setSelectedZone((prev) => (prev === zoneId ? null : zoneId));
        });
        htmlEl.parentNode?.replaceChild(newEl, htmlEl);
      });
    }
  });

  const hoveredZoneInfo = hoveredZone ? zoneLookup.get(hoveredZone) : null;
  const hoveredHeatmap = hoveredZone ? heatmapMap.get(hoveredZone) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
          Delavan Lake Map
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Interactive bathymetric map with fishing hotspots
        </p>
      </div>

      <MapControls
        species={species}
        selectedSpecies={selectedSpecies}
        selectedMonth={selectedMonth}
        onSpeciesChange={setSelectedSpecies}
        onMonthChange={setSelectedMonth}
        showContours={showContours}
        showLandmarks={showLandmarks}
        showVegetation={showVegetation}
        showHazards={showHazards}
        onToggleContours={() => setShowContours((p) => !p)}
        onToggleLandmarks={() => setShowLandmarks((p) => !p)}
        onToggleVegetation={() => setShowVegetation((p) => !p)}
        onToggleHazards={() => setShowHazards((p) => !p)}
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <div
            ref={svgContainerRef}
            className="overflow-hidden rounded-xl border border-gray-200 bg-[#e8e0d4] shadow-lg dark:border-gray-700"
          />

          <MapLegend
            mode={hasHeatmap ? 'heatmap' : 'depth'}
            className="absolute bottom-3 left-3"
          />

          {tooltipPos && hoveredZoneInfo && (
            <div
              className="pointer-events-none fixed z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
              style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
            >
              <p className="font-semibold text-gray-900 dark:text-white">
                {hoveredZoneInfo.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {hoveredZoneInfo.typical_depth_min}-{hoveredZoneInfo.typical_depth_max}ft depth
              </p>
              {hoveredHeatmap && hoveredHeatmap.report_count > 0 && (
                <p className="mt-0.5 text-xs font-medium text-lake-600 dark:text-lake-400">
                  {hoveredHeatmap.report_count} reports
                </p>
              )}
              <p className="mt-1 text-[10px] text-gray-400">Click for details</p>
            </div>
          )}
        </div>

        {selectedZone && (
          <ZoneDetailPanel
            zoneId={selectedZone}
            onClose={() => setSelectedZone(null)}
          />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Fishing Zones
        </h2>
        {zones.length === 0 ? (
          <LoadingState count={3} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {zones
              .filter((z) => z.report_count > 0)
              .sort((a, b) => b.report_count - a.report_count)
              .map((zone) => (
                <button
                  key={zone.zone_id}
                  onClick={() => setSelectedZone(zone.zone_id === selectedZone ? null : zone.zone_id)}
                  className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                    zone.zone_id === selectedZone
                      ? 'border-lake-500 bg-lake-50 dark:border-lake-400 dark:bg-lake-900/30'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{zone.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {zone.report_count} reports
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {zone.typical_depth_min}-{zone.typical_depth_max}ft
                  </p>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
