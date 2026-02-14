"""Database module for storing fishing reports."""
import sqlite3
from pathlib import Path
from typing import Optional
from datetime import datetime

DATABASE_PATH = Path(__file__).parent / "fishing_reports.db"


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize the database with required tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # Raw reports table - stores original scraped data
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS raw_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT UNIQUE,
            date_posted TEXT,
            username TEXT,
            raw_content TEXT,
            weather_badge TEXT,
            location_tag TEXT,
            image_urls TEXT,
            scraped_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Processed reports table - stores LLM-extracted data
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS processed_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            raw_report_id INTEGER UNIQUE,
            date_posted TEXT,
            month INTEGER,
            season TEXT,
            water_depth_feet REAL,
            species_caught TEXT,
            species_targeted TEXT,
            bait_lure TEXT,
            location TEXT,
            water_temp_f REAL,
            air_temp_f REAL,
            weather_conditions TEXT,
            ice_thickness_inches REAL,
            notes TEXT,
            processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (raw_report_id) REFERENCES raw_reports(id)
        )
    """)

    # Create indexes for common queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_processed_month ON processed_reports(month)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_processed_species ON processed_reports(species_caught)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_processed_season ON processed_reports(season)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_processed_location ON processed_reports(location)")

    conn.commit()
    conn.close()
    print("Database initialized successfully.")


def insert_raw_report(
    source_id: str,
    date_posted: str,
    username: str,
    raw_content: str,
    weather_badge: Optional[str] = None,
    location_tag: Optional[str] = None,
    image_urls: Optional[str] = None
) -> Optional[int]:
    """Insert a raw report into the database. Returns the ID or None if duplicate."""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO raw_reports (source_id, date_posted, username, raw_content, weather_badge, location_tag, image_urls)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (source_id, date_posted, username, raw_content, weather_badge, location_tag, image_urls))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        # Duplicate source_id
        return None
    finally:
        conn.close()


def insert_processed_report(
    raw_report_id: int,
    date_posted: Optional[str] = None,
    month: Optional[int] = None,
    season: Optional[str] = None,
    water_depth_feet: Optional[float] = None,
    species_caught: Optional[str] = None,
    species_targeted: Optional[str] = None,
    bait_lure: Optional[str] = None,
    location: Optional[str] = None,
    water_temp_f: Optional[float] = None,
    air_temp_f: Optional[float] = None,
    weather_conditions: Optional[str] = None,
    ice_thickness_inches: Optional[float] = None,
    notes: Optional[str] = None
) -> Optional[int]:
    """Insert a processed report into the database."""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO processed_reports
            (raw_report_id, date_posted, month, season, water_depth_feet, species_caught,
             species_targeted, bait_lure, location, water_temp_f, air_temp_f,
             weather_conditions, ice_thickness_inches, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (raw_report_id, date_posted, month, season, water_depth_feet, species_caught,
              species_targeted, bait_lure, location, water_temp_f, air_temp_f,
              weather_conditions, ice_thickness_inches, notes))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def get_unprocessed_reports(limit: int = 100) -> list:
    """Get raw reports that haven't been processed yet."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.* FROM raw_reports r
        LEFT JOIN processed_reports p ON r.id = p.raw_report_id
        WHERE p.id IS NULL
        ORDER BY r.id
        LIMIT ?
    """, (limit,))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_all_processed_reports() -> list:
    """Get all processed reports."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.*, r.raw_content, r.username, r.image_urls
        FROM processed_reports p
        JOIN raw_reports r ON p.raw_report_id = r.id
        ORDER BY p.date_posted DESC
    """)

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_reports_by_month(month: int) -> list:
    """Get processed reports for a specific month."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.*, r.raw_content, r.username
        FROM processed_reports p
        JOIN raw_reports r ON p.raw_report_id = r.id
        WHERE p.month = ?
        ORDER BY p.date_posted DESC
    """, (month,))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_reports_by_species(species: str) -> list:
    """Get processed reports for a specific species."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.*, r.raw_content, r.username
        FROM processed_reports p
        JOIN raw_reports r ON p.raw_report_id = r.id
        WHERE p.species_caught LIKE ?
        ORDER BY p.date_posted DESC
    """, (f"%{species}%",))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_stats() -> dict:
    """Get database statistics."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM raw_reports")
    raw_count = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM processed_reports")
    processed_count = cursor.fetchone()["count"]

    cursor.execute("""
        SELECT species_caught, COUNT(*) as count
        FROM processed_reports
        WHERE species_caught IS NOT NULL AND species_caught != ''
        GROUP BY species_caught
        ORDER BY count DESC
        LIMIT 10
    """)
    top_species = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "raw_reports": raw_count,
        "processed_reports": processed_count,
        "top_species": top_species
    }


if __name__ == "__main__":
    init_database()
