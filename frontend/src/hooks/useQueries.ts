import { useQuery } from '@tanstack/react-query';
import {
  getStats,
  getMonthlyStats,
  getAllSpecies,
  getLocationStats,
  getRecommendations,
  getTodayRecommendations,
  searchReports,
  getZones,
  getZoneStats,
  getHeatmapData,
  getSpeciesProfile,
} from '../api';
import type { SearchFilters } from '../types';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyStats() {
  return useQuery({
    queryKey: ['monthlyStats'],
    queryFn: getMonthlyStats,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSpecies() {
  return useQuery({
    queryKey: ['species'],
    queryFn: getAllSpecies,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: getLocationStats,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecommendations(month?: number, species?: string) {
  return useQuery({
    queryKey: ['recommendations', month, species],
    queryFn: () => getRecommendations(month, species),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTodayRecommendations(month?: number) {
  return useQuery({
    queryKey: ['todayRecommendations', month],
    queryFn: () => getTodayRecommendations(month),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSearchReports(filters: SearchFilters) {
  return useQuery({
    queryKey: ['reports', 'search', filters],
    queryFn: () => searchReports(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useZones() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: getZones,
    staleTime: 10 * 60 * 1000,
  });
}

export function useZoneStats(zoneId: string | null) {
  return useQuery({
    queryKey: ['zoneStats', zoneId],
    queryFn: () => getZoneStats(zoneId!),
    enabled: !!zoneId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHeatmap(params: { species?: string; month?: number; season?: string }) {
  return useQuery({
    queryKey: ['heatmap', params],
    queryFn: () => getHeatmapData(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSpeciesProfile(species: string | null) {
  return useQuery({
    queryKey: ['speciesProfile', species],
    queryFn: () => getSpeciesProfile(species!),
    enabled: !!species,
    staleTime: 5 * 60 * 1000,
  });
}
