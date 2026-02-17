"""LLM processor for extracting structured fishing data from reports."""
import os
import json
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Optional

from openai import OpenAI
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

from database import (
    init_database,
    get_unprocessed_reports,
    insert_processed_report,
    get_stats
)

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EXTRACTION_PROMPT = """You are an expert at extracting structured fishing information from fishing reports.

Analyze the following fishing report and extract the relevant information. Return ONLY valid JSON with the following structure:

{{
    "date_posted": "ISO format date if available, or null",
    "month": 1-12 integer for the month, or null if unknown,
    "season": "winter", "spring", "summer", or "fall" based on the date/context,
    "water_depth_feet": number in feet, or null if not mentioned,
    "species_caught": "comma-separated list of fish species actually caught",
    "species_targeted": "comma-separated list of fish species they were trying to catch",
    "bait_lure": "comma-separated list of baits or lures used",
    "location": "specific location on the lake if mentioned",
    "water_temp_f": number in Fahrenheit, or null if not mentioned,
    "air_temp_f": number in Fahrenheit, or null if not mentioned,
    "weather_conditions": "sunny, cloudy, partly cloudy, rainy, snowy, etc.",
    "ice_thickness_inches": number in inches if ice fishing, or null,
    "notes": "any other relevant fishing tips or observations"
}}

Common fish species in Delavan Lake include: Largemouth Bass, Smallmouth Bass, Walleye, Northern Pike, Musky (Muskellunge), Bluegill, Crappie, Perch, Catfish, Carp, Panfish.

For location, look for references to: weed beds, drop-offs, points, bays, north/south/east/west shore, specific road names, depth contours, structures.

For bait/lures, look for: minnows, nightcrawlers, worms, jigs, crankbaits, spinnerbaits, soft plastics, live bait, tip-ups, jigging spoons, etc.

If information is not explicitly stated, use null rather than guessing.

FISHING REPORT:
Date: {date_posted}
Weather Badge: {weather_badge}
Location Tag: {location_tag}
Content: {raw_content}

Return ONLY the JSON object, no other text."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def extract_fishing_data(report: dict) -> Optional[dict]:
    """Use OpenAI to extract structured data from a fishing report."""
    prompt = EXTRACTION_PROMPT.format(
        date_posted=report.get("date_posted", "Not specified"),
        weather_badge=report.get("weather_badge", "Not specified"),
        location_tag=report.get("location_tag", "Not specified"),
        raw_content=report.get("raw_content", "")
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Cost-effective for extraction tasks
            messages=[
                {"role": "system", "content": "You are a fishing report analyzer. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for consistent extraction
            max_tokens=500
        )

        content = response.choices[0].message.content.strip()

        # Clean up the response - remove markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        data = json.loads(content)
        return data

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Response was: {content[:200]}...")
        return None
    except Exception as e:
        print(f"OpenAI API error: {e}")
        raise


def get_season_from_month(month: int) -> str:
    """Determine season from month number."""
    if month in [12, 1, 2]:
        return "winter"
    elif month in [3, 4, 5]:
        return "spring"
    elif month in [6, 7, 8]:
        return "summer"
    else:
        return "fall"


def _process_single_report(report: dict) -> tuple[int, Optional[dict], Optional[str]]:
    """Process a single report. Returns (report_id, extracted_data, error_message)."""
    try:
        extracted = extract_fishing_data(report)
        if not extracted:
            return (report["id"], None, "Failed to extract data")
        return (report["id"], extracted, None)
    except Exception as e:
        return (report["id"], None, str(e))


def process_reports(batch_size: int = 100, max_reports: Optional[int] = None, workers: int = 10):
    """
    Process unprocessed raw reports using the LLM.

    Args:
        batch_size: Number of reports to process in each batch
        max_reports: Maximum total reports to process (None for all)
        workers: Number of concurrent API calls
    """
    init_database()

    total_processed = 0
    total_errors = 0

    print(f"Starting LLM processing of fishing reports ({workers} concurrent workers)...")

    while True:
        # Check if we've reached the max
        if max_reports and total_processed >= max_reports:
            print(f"Reached max reports limit ({max_reports})")
            break

        # Get batch of unprocessed reports
        limit = min(batch_size, max_reports - total_processed) if max_reports else batch_size
        reports = get_unprocessed_reports(limit=limit)

        if not reports:
            print("No more unprocessed reports.")
            break

        # Build a lookup for quick access by report ID
        reports_by_id = {r["id"]: r for r in reports}

        print(f"Processing batch of {len(reports)} reports...")

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {executor.submit(_process_single_report, r): r["id"] for r in reports}

            for future in as_completed(futures):
                report_id, extracted, error = future.result()
                report = reports_by_id[report_id]

                if error:
                    total_errors += 1
                    print(f"  Error report {report_id}: {error}")
                    continue

                # Ensure we have a valid month
                month = extracted.get("month")
                if not month and report.get("date_posted"):
                    try:
                        dt = datetime.fromisoformat(report["date_posted"])
                        month = dt.month
                    except (ValueError, TypeError):
                        pass

                # Ensure we have a season
                season = extracted.get("season")
                if not season and month:
                    season = get_season_from_month(month)

                # Insert processed report
                result = insert_processed_report(
                    raw_report_id=report["id"],
                    date_posted=extracted.get("date_posted") or report.get("date_posted"),
                    month=month,
                    season=season,
                    water_depth_feet=extracted.get("water_depth_feet"),
                    species_caught=extracted.get("species_caught"),
                    species_targeted=extracted.get("species_targeted"),
                    bait_lure=extracted.get("bait_lure"),
                    location=extracted.get("location"),
                    water_temp_f=extracted.get("water_temp_f"),
                    air_temp_f=extracted.get("air_temp_f"),
                    weather_conditions=extracted.get("weather_conditions"),
                    ice_thickness_inches=extracted.get("ice_thickness_inches"),
                    notes=extracted.get("notes")
                )

                if result:
                    total_processed += 1
                    species = extracted.get("species_caught", "unknown")
                    if total_processed % 100 == 0:
                        print(f"  Progress: {total_processed} processed, {total_errors} errors")
                else:
                    print(f"  Report {report_id} already processed")

        print(f"  Batch done: {total_processed} total processed, {total_errors} total errors")

    print(f"\nProcessing complete!")
    print(f"Total reports processed: {total_processed}")
    print(f"Total errors: {total_errors}")

    stats = get_stats()
    print(f"\nDatabase statistics:")
    print(f"  Raw reports: {stats['raw_reports']}")
    print(f"  Processed reports: {stats['processed_reports']}")
    if stats['top_species']:
        print(f"  Top species caught:")
        for s in stats['top_species'][:5]:
            print(f"    - {s['species_caught']}: {s['count']} reports")


def process_sample(num_reports: int = 10):
    """Process a small sample for testing."""
    print(f"Processing {num_reports} reports as a sample...")
    process_reports(batch_size=num_reports, max_reports=num_reports)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process fishing reports with LLM")
    parser.add_argument("--batch", type=int, default=100, help="Batch size for processing")
    parser.add_argument("--max", type=int, default=None, help="Max reports to process (default: all)")
    parser.add_argument("--workers", type=int, default=10, help="Number of concurrent API calls (default: 10)")
    parser.add_argument("--sample", action="store_true", help="Process only 10 reports as a sample")

    args = parser.parse_args()

    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable not set.")
        print("Please create a .env file with your OpenAI API key:")
        print("  OPENAI_API_KEY=your-api-key-here")
        exit(1)

    if args.sample:
        process_sample()
    else:
        process_reports(batch_size=args.batch, max_reports=args.max, workers=args.workers)
