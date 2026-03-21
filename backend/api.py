"""FastAPI backend for serving fishing report data."""
import os
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import (
    init_database,
    get_all_processed_reports,
    get_reports_by_month,
    get_reports_by_species,
    get_stats,
    get_connection
)
from location_mapper import get_all_zones, map_location_to_zone, get_zone, FISHING_ZONES
from recommender import get_today_recommendations

app = FastAPI(
    title="Delavan Lake Fishing Reports API",
    description="API for accessing historical fishing report data from Delavan Lake, Wisconsin",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FishingReport(BaseModel):
    id: int
    raw_report_id: int
    date_posted: Optional[str]
    month: Optional[int]
    season: Optional[str]
    water_depth_feet: Optional[float]
    species_caught: Optional[str]
    species_targeted: Optional[str]
    bait_lure: Optional[str]
    location: Optional[str]
    water_temp_f: Optional[float]
    air_temp_f: Optional[float]
    weather_conditions: Optional[str]
    ice_thickness_inches: Optional[float]
    notes: Optional[str]
    raw_content: Optional[str]
    username: Optional[str]
    image_urls: Optional[str]


class StatsResponse(BaseModel):
    raw_reports: int
    processed_reports: int
    top_species: list


class LocationStats(BaseModel):
    location: str
    count: int
    species: list
    avg_depth: Optional[float]


@app.on_event("startup")
async def startup():
    """Initialize database on startup."""
    init_database()


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "message": "Delavan Lake Fishing Reports API",
        "endpoints": {
            "/reports": "Get all processed reports",
            "/reports/month/{month}": "Get reports for a specific month (1-12)",
            "/reports/species/{species}": "Get reports for a specific species",
            "/reports/search": "Search reports with filters",
            "/stats": "Get database statistics",
            "/locations": "Get location statistics",
            "/species": "Get list of all species"
        }
    }


@app.get("/reports", response_model=list[FishingReport])
async def get_reports(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all processed fishing reports with pagination."""
    reports = get_all_processed_reports()
    return reports[offset:offset + limit]


@app.get("/reports/month/{month}", response_model=list[FishingReport])
async def get_reports_for_month(month: int):
    """Get fishing reports for a specific month."""
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    return get_reports_by_month(month)


@app.get("/reports/species/{species}", response_model=list[FishingReport])
async def get_reports_for_species(species: str):
    """Get fishing reports for a specific species."""
    return get_reports_by_species(species)


@app.get("/reports/search", response_model=list[FishingReport])
async def search_reports(
    month: Optional[int] = Query(None, ge=1, le=12),
    season: Optional[str] = Query(None),
    species: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    weather: Optional[str] = Query(None),
    min_depth: Optional[float] = Query(None),
    max_depth: Optional[float] = Query(None),
    limit: int = Query(100, ge=1, le=1000)
):
    """Search reports with multiple filters."""
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT p.*, r.raw_content, r.username, r.image_urls
        FROM processed_reports p
        JOIN raw_reports r ON p.raw_report_id = r.id
        WHERE 1=1
    """
    params = []

    if month:
        query += " AND p.month = ?"
        params.append(month)

    if season:
        query += " AND p.season = ?"
        params.append(season)

    if species:
        query += " AND (p.species_caught LIKE ? OR p.species_targeted LIKE ?)"
        params.extend([f"%{species}%", f"%{species}%"])

    if location:
        query += " AND p.location LIKE ?"
        params.append(f"%{location}%")

    if weather:
        query += " AND p.weather_conditions LIKE ?"
        params.append(f"%{weather}%")

    if min_depth:
        query += " AND p.water_depth_feet >= ?"
        params.append(min_depth)

    if max_depth:
        query += " AND p.water_depth_feet <= ?"
        params.append(max_depth)

    query += " ORDER BY p.date_posted DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return results


@app.get("/stats", response_model=StatsResponse)
async def get_statistics():
    """Get database statistics."""
    return get_stats()


@app.get("/species")
async def get_all_species():
    """Get list of all species with normalized counts.

    Species are stored as comma-separated combos (e.g. 'Bluegill, Crappie').
    This endpoint splits combos and aggregates individual species counts so each
    species is reported once with its true total across all reports.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT species_caught
        FROM processed_reports
        WHERE species_caught IS NOT NULL AND species_caught != ''
    """)

    species_counts: dict[str, int] = {}
    skip = {"unknown", "none", ""}
    for row in cursor.fetchall():
        for sp in row["species_caught"].split(","):
            sp = sp.strip().title()  # Normalize case: "bluegill" -> "Bluegill"
            if sp.lower() not in skip:
                species_counts[sp] = species_counts.get(sp, 0) + 1

    conn.close()

    results = sorted(
        [{"species": k, "count": v} for k, v in species_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )
    return results


@app.get("/locations")
async def get_location_stats():
    """Get location statistics."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            location,
            COUNT(*) as count,
            AVG(water_depth_feet) as avg_depth,
            GROUP_CONCAT(DISTINCT species_caught) as species
        FROM processed_reports
        WHERE location IS NOT NULL AND location != ''
        GROUP BY location
        ORDER BY count DESC
    """)

    results = []
    for row in cursor.fetchall():
        species_list = row["species"].split(",") if row["species"] else []
        results.append({
            "location": row["location"],
            "count": row["count"],
            "avg_depth": round(row["avg_depth"], 1) if row["avg_depth"] else None,
            "species": list(set(species_list))[:10]  # Dedupe and limit
        })

    conn.close()
    return results


@app.get("/months")
async def get_monthly_stats():
    """Get statistics by month."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            month,
            COUNT(*) as report_count,
            AVG(water_temp_f) as avg_water_temp,
            AVG(air_temp_f) as avg_air_temp,
            GROUP_CONCAT(DISTINCT species_caught) as species
        FROM processed_reports
        WHERE month IS NOT NULL
        GROUP BY month
        ORDER BY month
    """)

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    results = []
    for row in cursor.fetchall():
        month_num = row["month"]
        species_list = row["species"].split(",") if row["species"] else []
        results.append({
            "month": month_num,
            "month_name": month_names[month_num - 1] if 1 <= month_num <= 12 else "Unknown",
            "report_count": row["report_count"],
            "avg_water_temp": round(row["avg_water_temp"], 1) if row["avg_water_temp"] else None,
            "avg_air_temp": round(row["avg_air_temp"], 1) if row["avg_air_temp"] else None,
            "top_species": list(set(species_list))[:5]
        })

    conn.close()
    return results


@app.get("/recommendations")
async def get_recommendations(
    month: Optional[int] = Query(None, ge=1, le=12),
    species: Optional[str] = Query(None)
):
    """Get fishing recommendations based on historical data."""
    conn = get_connection()
    cursor = conn.cursor()

    # If no month specified, use current month
    if not month:
        month = datetime.now().month

    # Get reports for this month
    query = """
        SELECT
            species_caught,
            location,
            bait_lure,
            water_depth_feet,
            weather_conditions,
            COUNT(*) as success_count
        FROM processed_reports
        WHERE month = ?
    """
    params = [month]

    if species:
        query += " AND species_caught LIKE ?"
        params.append(f"%{species}%")

    query += """
        AND species_caught IS NOT NULL AND species_caught != ''
        GROUP BY species_caught, location, bait_lure
        ORDER BY success_count DESC
        LIMIT 20
    """

    cursor.execute(query, params)

    recommendations = []
    for row in cursor.fetchall():
        recommendations.append({
            "species": row["species_caught"],
            "location": row["location"],
            "bait_lure": row["bait_lure"],
            "depth_feet": row["water_depth_feet"],
            "weather": row["weather_conditions"],
            "success_count": row["success_count"]
        })

    conn.close()

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    return {
        "month": month,
        "month_name": month_names[month - 1],
        "recommendations": recommendations
    }


@app.get("/recommendations/today")
async def get_recommendations_today(
    month: Optional[int] = Query(None, ge=1, le=12),
):
    """Get smart fishing recommendations for today (or a given month).

    Uses multi-dimensional scoring: volume, recency, data specificity,
    consistency across years, and conditions data.
    """
    if not month:
        month = datetime.now().month

    conn = get_connection()
    recommendations = get_today_recommendations(conn, month)
    conn.close()

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    return {
        "month": month,
        "month_name": month_names[month - 1],
        "recommendations": [
            {
                "species": r.species,
                "confidence": r.confidence,
                "report_count_this_month": r.report_count,
                "best_zone": {
                    "zone_id": r.best_zone_id,
                    "name": r.best_zone_name,
                } if r.best_zone_id else None,
                "best_bait": r.best_bait,
                "target_depth": r.target_depth,
                "historical_water_temp": {
                    "min": r.water_temp_min,
                    "avg": r.water_temp_avg,
                    "max": r.water_temp_max,
                } if r.water_temp_avg else None,
                "is_ice_fishing_month": r.is_ice_fishing,
                "years_with_catches": r.years_with_catches,
                "total_years_data": r.total_years_data,
            }
            for r in recommendations[:10]
        ],
    }


@app.get("/zones")
async def get_zones():
    """Get all fishing zones with report counts."""
    zones = get_all_zones()
    conn = get_connection()
    cursor = conn.cursor()

    # Count reports per zone by mapping locations
    cursor.execute("""
        SELECT location, COUNT(*) as count
        FROM processed_reports
        WHERE location IS NOT NULL AND location != ''
        GROUP BY location
    """)

    zone_counts: dict[str, int] = {}
    for row in cursor.fetchall():
        zone_id = map_location_to_zone(row["location"])
        if zone_id:
            zone_counts[zone_id] = zone_counts.get(zone_id, 0) + row["count"]

    conn.close()

    for zone in zones:
        zone["report_count"] = zone_counts.get(zone["zone_id"], 0)

    return zones


@app.get("/zones/{zone_id}/stats")
async def get_zone_stats(zone_id: str):
    """Get detailed statistics for a fishing zone."""
    zone_info = get_zone(zone_id)
    if not zone_info:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")

    conn = get_connection()
    cursor = conn.cursor()

    # Get all reports and filter by zone mapping
    cursor.execute("""
        SELECT p.*, r.raw_content, r.username, r.image_urls
        FROM processed_reports p
        JOIN raw_reports r ON p.raw_report_id = r.id
        WHERE p.location IS NOT NULL AND p.location != ''
        ORDER BY p.date_posted DESC
    """)

    zone_reports = []
    for row in cursor.fetchall():
        report = dict(row)
        if map_location_to_zone(report["location"]) == zone_id:
            zone_reports.append(report)

    conn.close()

    # Compute stats from zone reports
    species_counts: dict[str, int] = {}
    bait_counts: dict[str, int] = {}
    monthly_counts: dict[int, int] = {}
    depths: list[float] = []
    water_temps: list[float] = []

    for r in zone_reports:
        if r.get("species_caught"):
            for sp in r["species_caught"].split(","):
                sp = sp.strip()
                if sp:
                    species_counts[sp] = species_counts.get(sp, 0) + 1
        if r.get("bait_lure"):
            for b in r["bait_lure"].split(","):
                b = b.strip()
                if b:
                    bait_counts[b] = bait_counts.get(b, 0) + 1
        if r.get("month"):
            monthly_counts[r["month"]] = monthly_counts.get(r["month"], 0) + 1
        if r.get("water_depth_feet"):
            depths.append(r["water_depth_feet"])
        if r.get("water_temp_f"):
            water_temps.append(r["water_temp_f"])

    return {
        "zone": {
            "zone_id": zone_info.zone_id,
            "name": zone_info.name,
            "description": zone_info.description,
            "typical_depth_min": zone_info.typical_depth_min,
            "typical_depth_max": zone_info.typical_depth_max,
            "report_count": len(zone_reports),
        },
        "species_breakdown": sorted(
            [{"species": k, "count": v} for k, v in species_counts.items()],
            key=lambda x: x["count"], reverse=True
        )[:15],
        "top_baits": sorted(
            [{"bait": k, "count": v} for k, v in bait_counts.items()],
            key=lambda x: x["count"], reverse=True
        )[:10],
        "monthly_distribution": [
            {"month": m, "count": monthly_counts.get(m, 0)} for m in range(1, 13)
        ],
        "avg_depth": round(sum(depths) / len(depths), 1) if depths else None,
        "avg_water_temp": round(sum(water_temps) / len(water_temps), 1) if water_temps else None,
        "recent_reports": zone_reports[:10],
    }


@app.get("/heatmap")
async def get_heatmap(
    species: Optional[str] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    season: Optional[str] = Query(None),
):
    """Get zone-level heatmap data for map coloring."""
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT location, COUNT(*) as count
        FROM processed_reports
        WHERE location IS NOT NULL AND location != ''
    """
    params: list = []

    if species:
        query += " AND (species_caught LIKE ? OR species_targeted LIKE ?)"
        params.extend([f"%{species}%", f"%{species}%"])
    if month:
        query += " AND month = ?"
        params.append(month)
    if season:
        query += " AND season = ?"
        params.append(season)

    query += " GROUP BY location"
    cursor.execute(query, params)

    zone_counts: dict[str, int] = {}
    for row in cursor.fetchall():
        zone_id = map_location_to_zone(row["location"])
        if zone_id:
            zone_counts[zone_id] = zone_counts.get(zone_id, 0) + row["count"]

    conn.close()

    max_count = max(zone_counts.values()) if zone_counts else 1

    return [
        {
            "zone_id": zone.zone_id,
            "report_count": zone_counts.get(zone.zone_id, 0),
            "intensity": round(zone_counts.get(zone.zone_id, 0) / max_count, 3) if max_count > 0 else 0,
        }
        for zone in FISHING_ZONES
    ]


@app.get("/species/{species_name}/profile")
async def get_species_profile(species_name: str):
    """Get comprehensive profile data for a species."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get all reports for this species
    cursor.execute("""
        SELECT p.*, r.raw_content, r.username
        FROM processed_reports p
        JOIN raw_reports r ON p.raw_report_id = r.id
        WHERE p.species_caught LIKE ?
        ORDER BY p.date_posted DESC
    """, (f"%{species_name}%",))

    reports = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not reports:
        raise HTTPException(status_code=404, detail=f"No reports found for species '{species_name}'")

    # Monthly distribution
    monthly: dict[int, int] = {}
    yearly: dict[int, int] = {}
    bait_counts: dict[str, int] = {}
    zone_counts: dict[str, int] = {}
    depths: list[float] = []
    depth_by_season: dict[str, list[float]] = {}
    co_species: dict[str, int] = {}

    for r in reports:
        if r.get("month"):
            monthly[r["month"]] = monthly.get(r["month"], 0) + 1
        if r.get("date_posted"):
            try:
                year = int(r["date_posted"][:4])
                if 2000 <= year <= 2030:
                    yearly[year] = yearly.get(year, 0) + 1
            except (ValueError, IndexError):
                pass
        if r.get("bait_lure"):
            for b in r["bait_lure"].split(","):
                b = b.strip()
                if b:
                    bait_counts[b] = bait_counts.get(b, 0) + 1
        if r.get("location"):
            zone_id = map_location_to_zone(r["location"])
            if zone_id:
                zone_name = get_zone(zone_id)
                key = zone_id
                zone_counts[key] = zone_counts.get(key, 0) + 1
        if r.get("water_depth_feet"):
            depths.append(r["water_depth_feet"])
            if r.get("season"):
                depth_by_season.setdefault(r["season"], []).append(r["water_depth_feet"])
        if r.get("species_caught"):
            for sp in r["species_caught"].split(","):
                sp = sp.strip().title()
                if sp and sp.lower() != species_name.lower():
                    co_species[sp] = co_species.get(sp, 0) + 1

    peak_month = max(monthly, key=monthly.get) if monthly else None

    return {
        "species": species_name,
        "total_reports": len(reports),
        "peak_month": peak_month,
        "avg_depth": round(sum(depths) / len(depths), 1) if depths else None,
        "depth_range": {"min": min(depths), "max": max(depths)} if depths else None,
        "monthly_distribution": [
            {"month": m, "count": monthly.get(m, 0)} for m in range(1, 13)
        ],
        "yearly_trend": sorted(
            [{"year": k, "count": v} for k, v in yearly.items()],
            key=lambda x: x["year"]
        ),
        "top_baits": sorted(
            [{"bait": k, "count": v} for k, v in bait_counts.items()],
            key=lambda x: x["count"], reverse=True
        )[:10],
        "top_zones": sorted(
            [
                {"zone_id": k, "name": get_zone(k).name if get_zone(k) else k, "count": v}
                for k, v in zone_counts.items()
            ],
            key=lambda x: x["count"], reverse=True
        )[:10],
        "depth_by_season": [
            {
                "season": s,
                "avg_depth": round(sum(ds) / len(ds), 1)
            }
            for s, ds in depth_by_season.items()
        ],
        "associated_species": sorted(
            [{"species": k, "co_occurrence_count": v} for k, v in co_species.items()],
            key=lambda x: x["co_occurrence_count"], reverse=True
        )[:10],
    }


@app.get("/analytics/trends")
async def get_analytics_trends():
    """Get year-over-year trend data for the lake."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            date_posted, species_caught, water_temp_f, air_temp_f
        FROM processed_reports
        WHERE date_posted IS NOT NULL
    """)

    yearly: dict[int, dict] = {}
    skip_species = {"unknown", "none", ""}

    for row in cursor.fetchall():
        try:
            year = int(row["date_posted"][:4])
        except (ValueError, IndexError, TypeError):
            continue
        if year < 2000 or year > 2030:
            continue

        if year not in yearly:
            yearly[year] = {
                "report_count": 0,
                "species_set": set(),
                "water_temps": [],
                "air_temps": [],
            }

        y = yearly[year]
        y["report_count"] += 1

        if row["species_caught"]:
            for sp in row["species_caught"].split(","):
                sp = sp.strip()
                if sp.lower() not in skip_species:
                    y["species_set"].add(sp)

        if row["water_temp_f"] is not None:
            try:
                y["water_temps"].append(float(row["water_temp_f"]))
            except (ValueError, TypeError):
                pass
        if row["air_temp_f"] is not None:
            try:
                y["air_temps"].append(float(row["air_temp_f"]))
            except (ValueError, TypeError):
                pass

    conn.close()

    # Build a cumulative set to detect new species per year
    seen_species: set[str] = set()
    results = []
    for year in sorted(yearly.keys()):
        y = yearly[year]
        new_species = y["species_set"] - seen_species
        seen_species |= y["species_set"]

        results.append({
            "year": year,
            "report_count": y["report_count"],
            "species_diversity": len(y["species_set"]),
            "avg_water_temp": (
                round(sum(y["water_temps"]) / len(y["water_temps"]), 1)
                if y["water_temps"] else None
            ),
            "avg_air_temp": (
                round(sum(y["air_temps"]) / len(y["air_temps"]), 1)
                if y["air_temps"] else None
            ),
            "new_species": sorted(new_species) if new_species else [],
        })

    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
