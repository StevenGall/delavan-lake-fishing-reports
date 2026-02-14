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
    """Get list of all species with counts."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT species_caught, COUNT(*) as count
        FROM processed_reports
        WHERE species_caught IS NOT NULL AND species_caught != ''
        GROUP BY species_caught
        ORDER BY count DESC
    """)

    results = [{"species": row["species_caught"], "count": row["count"]} for row in cursor.fetchall()]
    conn.close()

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
