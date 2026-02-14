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
