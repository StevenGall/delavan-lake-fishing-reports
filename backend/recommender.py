"""Smart fishing recommendation engine for Delavan Lake.

Scores species+technique combinations using multiple dimensions:
- Report volume for current month (30%)
- Recency weighting — newer reports score higher (20%)
- Data specificity — reports with location+bait+depth scored higher (20%)
- Consistency — caught across multiple years in this month (15%)
- Conditions match — reports with weather/temp data (15%)
"""
import sqlite3
from dataclasses import dataclass
from datetime import datetime

from location_mapper import map_location_to_zone, get_zone


@dataclass
class SpeciesRecommendation:
    species: str
    confidence: int  # 0-100
    report_count: int
    best_zone_id: str | None
    best_zone_name: str | None
    best_bait: str | None
    target_depth: float | None
    water_temp_min: float | None
    water_temp_avg: float | None
    water_temp_max: float | None
    is_ice_fishing: bool
    years_with_catches: int
    total_years_data: int


def get_today_recommendations(conn: sqlite3.Connection, month: int | None = None) -> list[SpeciesRecommendation]:
    """Generate smart fishing recommendations for a given month.

    Returns a ranked list of species with confidence scores and best tactics.
    """
    if month is None:
        month = datetime.now().month

    cursor = conn.cursor()

    # Get all reports for this month
    cursor.execute("""
        SELECT
            p.species_caught, p.location, p.bait_lure, p.water_depth_feet,
            p.water_temp_f, p.weather_conditions, p.ice_thickness_inches,
            p.date_posted, p.season
        FROM processed_reports p
        WHERE p.month = ?
          AND p.species_caught IS NOT NULL AND p.species_caught != ''
    """, (month,))

    reports = [dict(row) for row in cursor.fetchall()]
    if not reports:
        return []

    # Get total year span of data
    cursor.execute("""
        SELECT MIN(CAST(SUBSTR(date_posted, 1, 4) AS INTEGER)) as min_year,
               MAX(CAST(SUBSTR(date_posted, 1, 4) AS INTEGER)) as max_year
        FROM processed_reports
        WHERE date_posted IS NOT NULL AND LENGTH(date_posted) >= 4
    """)
    year_row = cursor.fetchone()
    min_year = year_row["min_year"] or 2001
    max_year = year_row["max_year"] or 2026
    total_years = max(max_year - min_year + 1, 1)

    # Group reports by species
    species_data: dict[str, list[dict]] = {}
    for r in reports:
        for sp in r["species_caught"].split(","):
            sp = sp.strip()
            if sp:
                species_data.setdefault(sp, []).append(r)

    # Score each species
    results: list[SpeciesRecommendation] = []
    total_reports_this_month = len(reports)

    for species, sp_reports in species_data.items():
        # Skip species with very few reports
        if len(sp_reports) < 2:
            continue

        # --- Dimension 1: Volume (30%) ---
        volume_ratio = len(sp_reports) / total_reports_this_month
        volume_score = min(volume_ratio * 3, 1.0)  # Cap at 1.0

        # --- Dimension 2: Recency (20%) ---
        years_seen = set()
        recent_count = 0
        for r in sp_reports:
            if r.get("date_posted") and len(r["date_posted"]) >= 4:
                try:
                    year = int(r["date_posted"][:4])
                    years_seen.add(year)
                    if year >= max_year - 4:  # Last 5 years
                        recent_count += 1
                except ValueError:
                    pass
        recency_score = min(recent_count / max(len(sp_reports) * 0.3, 1), 1.0)

        # --- Dimension 3: Data specificity (20%) ---
        specific_count = sum(
            1 for r in sp_reports
            if r.get("location") and r.get("bait_lure")
        )
        specificity_score = specific_count / len(sp_reports)

        # --- Dimension 4: Consistency across years (15%) ---
        consistency_score = min(len(years_seen) / max(total_years * 0.3, 1), 1.0)

        # --- Dimension 5: Conditions data (15%) ---
        conditions_count = sum(
            1 for r in sp_reports
            if r.get("water_temp_f") or r.get("weather_conditions")
        )
        conditions_score = conditions_count / len(sp_reports)

        # Weighted confidence
        confidence = (
            volume_score * 30
            + recency_score * 20
            + specificity_score * 20
            + consistency_score * 15
            + conditions_score * 15
        )
        confidence = min(round(confidence), 100)

        # Best zone
        zone_counts: dict[str, int] = {}
        for r in sp_reports:
            if r.get("location"):
                zone_id = map_location_to_zone(r["location"])
                if zone_id:
                    zone_counts[zone_id] = zone_counts.get(zone_id, 0) + 1

        best_zone_id = max(zone_counts, key=zone_counts.get) if zone_counts else None
        best_zone_info = get_zone(best_zone_id) if best_zone_id else None

        # Best bait
        bait_counts: dict[str, int] = {}
        for r in sp_reports:
            if r.get("bait_lure"):
                for b in r["bait_lure"].split(","):
                    b = b.strip()
                    if b:
                        bait_counts[b] = bait_counts.get(b, 0) + 1
        best_bait = max(bait_counts, key=bait_counts.get) if bait_counts else None

        # Target depth
        depths = [r["water_depth_feet"] for r in sp_reports if r.get("water_depth_feet")]
        target_depth = round(sum(depths) / len(depths), 1) if depths else None

        # Water temp
        temps = [r["water_temp_f"] for r in sp_reports if r.get("water_temp_f")]
        water_temp_min = round(min(temps), 1) if temps else None
        water_temp_avg = round(sum(temps) / len(temps), 1) if temps else None
        water_temp_max = round(max(temps), 1) if temps else None

        # Ice fishing detection
        ice_reports = [r for r in sp_reports if r.get("ice_thickness_inches") and r["ice_thickness_inches"] > 0]
        is_ice = len(ice_reports) > len(sp_reports) * 0.3

        results.append(SpeciesRecommendation(
            species=species,
            confidence=confidence,
            report_count=len(sp_reports),
            best_zone_id=best_zone_id,
            best_zone_name=best_zone_info.name if best_zone_info else None,
            best_bait=best_bait,
            target_depth=target_depth,
            water_temp_min=water_temp_min,
            water_temp_avg=water_temp_avg,
            water_temp_max=water_temp_max,
            is_ice_fishing=is_ice,
            years_with_catches=len(years_seen),
            total_years_data=total_years,
        ))

    # Sort by confidence descending
    results.sort(key=lambda x: x.confidence, reverse=True)
    return results
