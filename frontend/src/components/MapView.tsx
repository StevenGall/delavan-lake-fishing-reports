import { useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { getRecommendations, getLocationStats } from '../api';
import type { Recommendation, LocationStat } from '../types';
import './MapView.css';

interface MarkerData extends Recommendation {
  coords: { lat: number; lng: number };
  index: number;
}

// Delavan Lake center coordinates
const DELAVAN_LAKE_CENTER = {
  lat: 42.6114,
  lng: -88.6373,
};

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '500px',
};

const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeId: 'satellite',
  zoom: 14,
  mapTypeControl: true,
  streetViewControl: false,
};

// Approximate locations on Delavan Lake (these are estimates)
const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'weed beds': { lat: 42.615, lng: -88.632 },
  'drop off': { lat: 42.608, lng: -88.640 },
  'north shore': { lat: 42.620, lng: -88.637 },
  'south shore': { lat: 42.602, lng: -88.637 },
  'east end': { lat: 42.611, lng: -88.620 },
  'west end': { lat: 42.611, lng: -88.655 },
  'deep water': { lat: 42.610, lng: -88.638 },
  'shallow': { lat: 42.618, lng: -88.630 },
  'bay': { lat: 42.605, lng: -88.645 },
  'point': { lat: 42.614, lng: -88.628 },
};

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

function getLocationCoordinates(location: string | null): { lat: number; lng: number } | null {
  if (!location) return null;

  const normalizedLocation = location.toLowerCase();

  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (normalizedLocation.includes(key)) {
      // Add small random offset to prevent marker overlap
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.003,
        lng: coords.lng + (Math.random() - 0.5) * 0.003,
      };
    }
  }

  // Default to random position near lake center
  return {
    lat: DELAVAN_LAKE_CENTER.lat + (Math.random() - 0.5) * 0.01,
    lng: DELAVAN_LAKE_CENTER.lng + (Math.random() - 0.5) * 0.015,
  };
}

export function MapView() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [locations, setLocations] = useState<LocationStat[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [recsData, locsData] = await Promise.all([
          getRecommendations(selectedMonth),
          getLocationStats(),
        ]);
        setRecommendations(recsData.recommendations);
        setLocations(locsData);
      } catch (err) {
        setError('Failed to load data. Make sure the API server is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedMonth]);

  const onLoad = useCallback(() => {
    // Map loaded
  }, []);

  const markers = useMemo((): MarkerData[] => {
    return recommendations
      .filter((r) => r.location)
      .map((rec, index) => {
        const coords = getLocationCoordinates(rec.location);
        if (!coords) return null;
        return { ...rec, coords, index };
      })
      .filter((m): m is MarkerData => m !== null);
  }, [recommendations]);

  if (!apiKey) {
    return (
      <div className="map-container">
        <div className="map-header">
          <h1>Fishing Spots Map</h1>
          <p>View recommended fishing locations on Delavan Lake</p>
        </div>
        <div className="map-error">
          <h3>Google Maps API Key Required</h3>
          <p>
            To view the map, please add your Google Maps API key to the environment:
          </p>
          <code>VITE_GOOGLE_MAPS_API_KEY=your-api-key</code>
          <p style={{ marginTop: '1rem' }}>
            You can get an API key from the{' '}
            <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer">
              Google Cloud Console
            </a>
          </p>
        </div>

        {/* Show recommendations as a list instead */}
        <div className="recommendations-fallback">
          <div className="month-selector">
            <label>Month:</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {loading && <div className="loading">Loading recommendations...</div>}
          {error && <div className="error">{error}</div>}

          {!loading && !error && (
            <div className="recommendations-list">
              <h3>Top Fishing Recommendations for {MONTHS[selectedMonth - 1].label}</h3>
              {recommendations.length === 0 ? (
                <p>No recommendations available for this month.</p>
              ) : (
                <div className="rec-cards">
                  {recommendations.slice(0, 10).map((rec, index) => (
                    <div key={index} className="rec-card">
                      <div className="rec-species">{rec.species}</div>
                      <div className="rec-details">
                        {rec.location && <span><strong>Location:</strong> {rec.location}</span>}
                        {rec.bait_lure && <span><strong>Bait:</strong> {rec.bait_lure}</span>}
                        {rec.depth_feet && <span><strong>Depth:</strong> {rec.depth_feet} ft</span>}
                        {rec.weather && <span><strong>Weather:</strong> {rec.weather}</span>}
                      </div>
                      <div className="rec-count">{rec.success_count} successful reports</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div className="map-error">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="map-loading">Loading map...</div>;
  }

  return (
    <div className="map-container">
      <div className="map-header">
        <h1>Fishing Spots Map</h1>
        <p>View recommended fishing locations on Delavan Lake</p>
      </div>

      <div className="map-controls">
        <div className="month-selector">
          <label>Select Month:</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="map-legend">
          <span className="legend-item">
            <span className="legend-marker">📍</span>
            Fishing spots based on {recommendations.length} recommendations
          </span>
        </div>
      </div>

      {loading && <div className="loading-overlay">Loading...</div>}
      {error && <div className="error">{error}</div>}

      <div className="map-wrapper">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={DELAVAN_LAKE_CENTER}
          zoom={14}
          options={MAP_OPTIONS}
          onLoad={onLoad}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.index}
              position={marker.coords}
              onClick={() => setSelectedMarker(marker)}
              title={`${marker.species} - ${marker.location}`}
            />
          ))}

          {selectedMarker && (
            <InfoWindow
              position={selectedMarker.coords}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="info-window">
                <h4>{selectedMarker.species}</h4>
                <p><strong>Location:</strong> {selectedMarker.location}</p>
                {selectedMarker.bait_lure && (
                  <p><strong>Bait/Lure:</strong> {selectedMarker.bait_lure}</p>
                )}
                {selectedMarker.depth_feet && (
                  <p><strong>Depth:</strong> {selectedMarker.depth_feet} ft</p>
                )}
                {selectedMarker.weather && (
                  <p><strong>Weather:</strong> {selectedMarker.weather}</p>
                )}
                <p className="success-count">
                  {selectedMarker.success_count} successful reports
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className="location-stats">
        <h3>Popular Locations</h3>
        <div className="location-cards">
          {locations.slice(0, 6).map((loc) => (
            <div key={loc.location} className="location-card">
              <div className="location-name">{loc.location}</div>
              <div className="location-count">{loc.count} reports</div>
              {loc.avg_depth && (
                <div className="location-depth">Avg depth: {loc.avg_depth} ft</div>
              )}
              <div className="location-species">
                {loc.species.slice(0, 3).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
