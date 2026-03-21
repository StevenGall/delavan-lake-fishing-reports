export interface FishingReport {
  id: number;
  raw_report_id: number;
  date_posted: string | null;
  month: number | null;
  season: string | null;
  water_depth_feet: number | null;
  species_caught: string | null;
  species_targeted: string | null;
  bait_lure: string | null;
  location: string | null;
  water_temp_f: number | null;
  air_temp_f: number | null;
  weather_conditions: string | null;
  ice_thickness_inches: number | null;
  notes: string | null;
  raw_content: string | null;
  username: string | null;
  image_urls: string | null;
}

export interface Stats {
  raw_reports: number;
  processed_reports: number;
  top_species: { species_caught: string; count: number }[];
}

export interface SpeciesCount {
  species: string;
  count: number;
}

export interface LocationStat {
  location: string;
  count: number;
  avg_depth: number | null;
  species: string[];
}

export interface MonthlyStat {
  month: number;
  month_name: string;
  report_count: number;
  avg_water_temp: number | null;
  avg_air_temp: number | null;
  top_species: string[];
}

export interface Recommendation {
  species: string;
  location: string | null;
  bait_lure: string | null;
  depth_feet: number | null;
  weather: string | null;
  success_count: number;
}

export interface RecommendationsResponse {
  month: number;
  month_name: string;
  recommendations: Recommendation[];
}

export interface SearchFilters {
  month?: number;
  season?: string;
  species?: string;
  location?: string;
  weather?: string;
  minDepth?: number;
  maxDepth?: number;
}

// New types for upcoming features

export interface FishingZone {
  zone_id: string;
  name: string;
  description: string;
  svg_path_id: string;
  typical_depth_min: number;
  typical_depth_max: number;
  report_count: number;
}

export interface ZoneStats {
  zone: FishingZone;
  species_breakdown: { species: string; count: number }[];
  monthly_distribution: { month: number; count: number }[];
  top_baits: { bait: string; count: number }[];
  avg_depth: number;
  avg_water_temp: number | null;
  recent_reports: FishingReport[];
}

export interface HeatmapData {
  zone_id: string;
  report_count: number;
  intensity: number; // 0-1 normalized
}

export interface SpeciesProfile {
  species: string;
  total_reports: number;
  peak_month: number;
  avg_depth: number | null;
  depth_range: { min: number; max: number } | null;
  monthly_distribution: { month: number; count: number }[];
  yearly_trend: { year: number; count: number }[];
  top_baits: { bait: string; count: number }[];
  top_zones: { zone_id: string; name: string; count: number }[];
  depth_by_season: { season: string; avg_depth: number }[];
  associated_species: { species: string; co_occurrence_count: number }[];
}

export interface TodayRecommendation {
  species: string;
  confidence: number; // 0-100
  best_zone: { zone_id: string; name: string } | null;
  best_bait: string | null;
  target_depth: number | null;
  historical_water_temp: { min: number; avg: number; max: number } | null;
  report_count_this_month: number;
  is_ice_fishing_month: boolean;
  years_with_catches: number;
  total_years_data: number;
}

export interface TodayRecommendationsResponse {
  month: number;
  month_name: string;
  recommendations: TodayRecommendation[];
}
