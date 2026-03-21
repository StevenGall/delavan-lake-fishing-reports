"""Database seeder for fishing reports - exports/imports processed data without API calls."""
import json
import argparse
import sqlite3
from pathlib import Path
from datetime import datetime

from database import DATABASE_PATH, get_connection, init_database


SEED_FILE = Path(__file__).parent / "seed_data.json"


def export_data(output_path: Path = SEED_FILE) -> dict:
    """Export all raw and processed reports to JSON file."""
    conn = get_connection()
    cursor = conn.cursor()

    # Export raw reports
    cursor.execute("SELECT * FROM raw_reports ORDER BY id")
    raw_reports = [dict(row) for row in cursor.fetchall()]

    # Export processed reports
    cursor.execute("SELECT * FROM processed_reports ORDER BY id")
    processed_reports = [dict(row) for row in cursor.fetchall()]

    conn.close()

    data = {
        "exported_at": datetime.now().isoformat(),
        "raw_reports": raw_reports,
        "processed_reports": processed_reports,
    }

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Exported {len(raw_reports)} raw reports and {len(processed_reports)} processed reports")
    print(f"Seed file: {output_path}")
    print(f"File size: {output_path.stat().st_size / 1024 / 1024:.1f} MB")

    return data


def seed_database(input_path: Path = SEED_FILE, clear_existing: bool = False):
    """
    Seed the database from exported JSON file.

    Args:
        input_path: Path to the seed JSON file
        clear_existing: If True, deletes existing data before seeding
    """
    if not input_path.exists():
        print(f"Error: Seed file not found: {input_path}")
        print("Run 'python seeder.py export' first to create the seed file.")
        return

    with open(input_path) as f:
        data = json.load(f)

    print(f"Loading seed data from {input_path}")
    print(f"  Exported at: {data.get('exported_at', 'unknown')}")
    print(f"  Raw reports: {len(data['raw_reports'])}")
    print(f"  Processed reports: {len(data['processed_reports'])}")

    init_database()
    conn = get_connection()
    cursor = conn.cursor()

    if clear_existing:
        print("Clearing existing data...")
        cursor.execute("DELETE FROM processed_reports")
        cursor.execute("DELETE FROM raw_reports")
        conn.commit()

    # Insert raw reports
    raw_inserted = 0
    raw_skipped = 0
    for report in data["raw_reports"]:
        try:
            cursor.execute("""
                INSERT INTO raw_reports (id, source_id, date_posted, username, raw_content,
                                         weather_badge, location_tag, image_urls, scraped_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report["id"],
                report["source_id"],
                report["date_posted"],
                report["username"],
                report["raw_content"],
                report.get("weather_badge"),
                report.get("location_tag"),
                report.get("image_urls"),
                report.get("scraped_at")
            ))
            raw_inserted += 1
        except sqlite3.IntegrityError:
            raw_skipped += 1

    # Insert processed reports
    processed_inserted = 0
    processed_skipped = 0
    for report in data["processed_reports"]:
        try:
            cursor.execute("""
                INSERT INTO processed_reports (id, raw_report_id, date_posted, month, season,
                                               water_depth_feet, species_caught, species_targeted,
                                               bait_lure, location, water_temp_f, air_temp_f,
                                               weather_conditions, ice_thickness_inches, notes, processed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report["id"],
                report["raw_report_id"],
                report["date_posted"],
                report.get("month"),
                report.get("season"),
                report.get("water_depth_feet"),
                report.get("species_caught"),
                report.get("species_targeted"),
                report.get("bait_lure"),
                report.get("location"),
                report.get("water_temp_f"),
                report.get("air_temp_f"),
                report.get("weather_conditions"),
                report.get("ice_thickness_inches"),
                report.get("notes"),
                report.get("processed_at")
            ))
            processed_inserted += 1
        except sqlite3.IntegrityError:
            processed_skipped += 1

    conn.commit()
    conn.close()

    print(f"\nSeeding complete:")
    print(f"  Raw reports: {raw_inserted} inserted, {raw_skipped} skipped (duplicates)")
    print(f"  Processed reports: {processed_inserted} inserted, {processed_skipped} skipped (duplicates)")


def stats():
    """Show current database statistics."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM raw_reports")
    raw_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM processed_reports")
    processed_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT species_caught, COUNT(*) as count
        FROM processed_reports
        WHERE species_caught IS NOT NULL AND species_caught != ''
        GROUP BY species_caught
        ORDER BY count DESC
        LIMIT 5
    """)
    top_species = cursor.fetchall()

    cursor.execute("""
        SELECT season, COUNT(*) as count
        FROM processed_reports
        WHERE season IS NOT NULL
        GROUP BY season
        ORDER BY count DESC
    """)
    by_season = cursor.fetchall()

    conn.close()

    print(f"Database: {DATABASE_PATH}")
    print(f"Raw reports: {raw_count}")
    print(f"Processed reports: {processed_count}")

    if top_species:
        print("\nTop 5 species caught:")
        for species, count in top_species:
            print(f"  {species}: {count}")

    if by_season:
        print("\nReports by season:")
        for season, count in by_season:
            print(f"  {season}: {count}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed/export fishing reports database")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Export command
    export_parser = subparsers.add_parser("export", help="Export database to JSON seed file")
    export_parser.add_argument("--output", type=Path, default=SEED_FILE, help="Output file path")

    # Seed command
    seed_parser = subparsers.add_parser("seed", help="Seed database from JSON file")
    seed_parser.add_argument("--input", type=Path, default=SEED_FILE, help="Input seed file path")
    seed_parser.add_argument("--clear", action="store_true", help="Clear existing data before seeding")

    # Stats command
    subparsers.add_parser("stats", help="Show database statistics")

    args = parser.parse_args()

    if args.command == "export":
        export_data(args.output)
    elif args.command == "seed":
        seed_database(args.input, args.clear)
    elif args.command == "stats":
        stats()
    else:
        parser.print_help()
