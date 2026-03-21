import axios from 'axios';
import type {
  FishingReport,
  FishingZone,
  HeatmapData,
  Stats,
  SpeciesCount,
  SpeciesProfile,
  LocationStat,
  MonthlyStat,
  RecommendationsResponse,
  SearchFilters,
  TodayRecommendationsResponse,
  ZoneStats,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export async function getReports(limit = 100, offset = 0): Promise<FishingReport[]> {
  const response = await api.get<FishingReport[]>('/reports', {
    params: { limit, offset },
  });
  return response.data;
}

export async function getReportsByMonth(month: number): Promise<FishingReport[]> {
  const response = await api.get<FishingReport[]>(`/reports/month/${month}`);
  return response.data;
}

export async function getReportsBySpecies(species: string): Promise<FishingReport[]> {
  const response = await api.get<FishingReport[]>(`/reports/species/${encodeURIComponent(species)}`);
  return response.data;
}

export async function searchReports(filters: SearchFilters): Promise<FishingReport[]> {
  const params: Record<string, string | number> = {};

  if (filters.month) params.month = filters.month;
  if (filters.season) params.season = filters.season;
  if (filters.species) params.species = filters.species;
  if (filters.location) params.location = filters.location;
  if (filters.weather) params.weather = filters.weather;
  if (filters.minDepth) params.min_depth = filters.minDepth;
  if (filters.maxDepth) params.max_depth = filters.maxDepth;

  const response = await api.get<FishingReport[]>('/reports/search', { params });
  return response.data;
}

export async function getStats(): Promise<Stats> {
  const response = await api.get<Stats>('/stats');
  return response.data;
}

export async function getAllSpecies(): Promise<SpeciesCount[]> {
  const response = await api.get<SpeciesCount[]>('/species');
  return response.data;
}

export async function getLocationStats(): Promise<LocationStat[]> {
  const response = await api.get<LocationStat[]>('/locations');
  return response.data;
}

export async function getMonthlyStats(): Promise<MonthlyStat[]> {
  const response = await api.get<MonthlyStat[]>('/months');
  return response.data;
}

export async function getRecommendations(
  month?: number,
  species?: string
): Promise<RecommendationsResponse> {
  const params: Record<string, string | number> = {};
  if (month) params.month = month;
  if (species) params.species = species;

  const response = await api.get<RecommendationsResponse>('/recommendations', { params });
  return response.data;
}

// Smart recommendations
export async function getTodayRecommendations(
  month?: number
): Promise<TodayRecommendationsResponse> {
  const params: Record<string, number> = {};
  if (month) params.month = month;

  const response = await api.get<TodayRecommendationsResponse>('/recommendations/today', {
    params,
  });
  return response.data;
}

// Zone / Map endpoints

export async function getZones(): Promise<FishingZone[]> {
  const response = await api.get<FishingZone[]>('/zones');
  return response.data;
}

export async function getZoneStats(zoneId: string): Promise<ZoneStats> {
  const response = await api.get<ZoneStats>(`/zones/${zoneId}/stats`);
  return response.data;
}

export async function getHeatmapData(params: {
  species?: string;
  month?: number;
  season?: string;
}): Promise<HeatmapData[]> {
  const queryParams: Record<string, string | number> = {};
  if (params.species) queryParams.species = params.species;
  if (params.month) queryParams.month = params.month;
  if (params.season) queryParams.season = params.season;

  const response = await api.get<HeatmapData[]>('/heatmap', { params: queryParams });
  return response.data;
}

export async function getSpeciesProfile(species: string): Promise<SpeciesProfile> {
  const response = await api.get<SpeciesProfile>(`/species/${encodeURIComponent(species)}/profile`);
  return response.data;
}
