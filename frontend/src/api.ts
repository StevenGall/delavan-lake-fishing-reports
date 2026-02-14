import axios from 'axios';
import type {
  FishingReport,
  Stats,
  SpeciesCount,
  LocationStat,
  MonthlyStat,
  RecommendationsResponse,
  SearchFilters,
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
