"""Web scraper for Lake-Link fishing reports."""
import os
import re
import time
import hashlib
import argparse
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from database import init_database, insert_raw_report, get_stats

load_dotenv()

BASE_URL = "https://www.lake-link.com/wisconsin-fishing-reports/delavan-lake-walworth-county/4470/"
LOGIN_URL = "https://www.lake-link.com/assets/cfcs/authenticate.cfc?method=authenticateUser"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def generate_source_id(username: str, date_posted: str, content: str) -> str:
    """Generate a unique source ID for deduplication."""
    combined = f"{username}:{date_posted}:{content[:100]}"
    return hashlib.md5(combined.encode()).hexdigest()


def parse_date(date_str: str) -> Optional[str]:
    """Parse date string to ISO format."""
    if not date_str:
        return None

    # Clean up the string
    date_str = date_str.strip()

    # Pattern: "2/7/26 @ 7:25 PM" or similar
    match = re.match(r"(\d{1,2})/(\d{1,2})/(\d{2})\s*@?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?", date_str, re.IGNORECASE)
    if match:
        month, day, year, hour, minute, ampm = match.groups()
        year = int(year)
        # Assume 20xx for years
        year = 2000 + year if year < 100 else year

        hour = int(hour)
        if ampm and ampm.upper() == "PM" and hour != 12:
            hour += 12
        elif ampm and ampm.upper() == "AM" and hour == 12:
            hour = 0

        try:
            dt = datetime(year, int(month), int(day), hour, int(minute))
            return dt.isoformat()
        except ValueError:
            pass

    return date_str


def create_session(authenticate: bool = True) -> requests.Session:
    """Create a requests session, optionally with Lake-Link authentication."""
    session = requests.Session()
    session.headers.update(HEADERS)

    if authenticate:
        email = os.environ.get("LAKELINK_EMAIL")
        password = os.environ.get("LAKELINK_PASSWORD")
        if not email or not password:
            print("Warning: LAKELINK_EMAIL/LAKELINK_PASSWORD not set in .env")
            print("Running without authentication (limited to ~225 recent reports)")
            return session

        # Hit the login page first to establish cookies
        session.get("https://www.lake-link.com/login/", timeout=30)

        payload = {
            "loginAccount": "Lake-Link",
            "email": email,
            "password": password,
        }
        resp = session.post(LOGIN_URL, json=payload, timeout=30)
        resp.raise_for_status()

        data = resp.json()
        if data.get("SUCCESS"):
            print(f"Authenticated as {email}")
        else:
            message = data.get("MESSAGE", "Unknown error")
            print(f"Authentication failed: {message}")
            print("Falling back to unauthenticated scraping")

    return session


def scrape_page(session: requests.Session, start_row: int = 1, records_per_page: int = 10) -> tuple[list, int]:
    """
    Scrape a single page of fishing reports.
    Returns (list of reports, total count).
    """
    params = {
        "startRow": start_row,
        "sortOrder": "DESC",
        "recordsToDisplay": records_per_page
    }

    response = session.get(BASE_URL, params=params, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    reports = []
    total_count = 0

    # Total count from "Displaying X to Y of Z posts"
    pagination_text = soup.find(string=re.compile(r"Displaying\s+\d+\s+to\s+\d+\s+of\s+[\d,]+\s+posts"))
    if pagination_text:
        match = re.search(r"of\s+([\d,]+)\s+posts", pagination_text)
        if match:
            total_count = int(match.group(1).replace(",", ""))

    # Each report is a <div id="post-id-NNNNNNN">
    report_divs = soup.find_all("div", id=re.compile(r"^post-id-"))

    for div in report_divs:
        try:
            report = parse_report(div)
            if report:
                reports.append(report)
        except Exception as e:
            print(f"Error parsing report: {e}")
            continue

    return reports, total_count


def parse_report(container) -> Optional[dict]:
    """Parse a single report container into structured data."""
    report = {}

    # Extract timestamp from <strong class="text-primary"><small>DATE</small></strong>
    date_el = container.find("strong", class_="text-primary")
    if date_el:
        date_text = date_el.get_text(strip=True)
        report["date_posted"] = parse_date(date_text)
    else:
        return None

    # Extract username from <h6>
    h6 = container.find("h6")
    if h6:
        # Username is the direct text, ignoring child elements like the online/offline icon
        report["username"] = h6.find(string=True, recursive=False).strip()
    else:
        report["username"] = "Unknown"

    # Extract weather/conditions from the badge row
    badge_row = container.find("div", class_=re.compile(r"d-flex.*align-items-center.*flex-wrap"))
    if badge_row:
        badges = badge_row.find_all("strong")
        badge_texts = [b.get_text(strip=True) for b in badges]

        # Weather badge is typically like "Sunny 40°" or "Partly Cloudy 25°"
        for text in badge_texts:
            if re.search(r"(Sunny|Cloudy|Overcast|Rain|Snow|Clear|Fog|Windy)", text, re.IGNORECASE):
                report["weather_badge"] = text
                break

        # Ice conditions
        ice_text = badge_row.get_text()
        ice_match = re.search(r'Ice:\s*(\d+["\u201d]?)', ice_text)
        if ice_match:
            report["ice_conditions"] = f"Ice: {ice_match.group(1)}"

    # Extract main content from <div class="card-text post-content ...">
    content_div = container.find("div", class_=re.compile(r"post-content"))
    if content_div:
        report["raw_content"] = content_div.get_text(strip=True)
    else:
        return None

    if len(report.get("raw_content", "")) < 10:
        return None

    # Extract image URLs from card-body (skip avatar images)
    card_body = container.find("div", class_="card-body")
    if card_body:
        images = card_body.find_all("img", src=re.compile(r"cloudinary|upload"))
        if images:
            report["image_urls"] = ",".join([img.get("src", "") for img in images if img.get("src")])

    # Generate unique ID
    report["source_id"] = generate_source_id(
        report.get("username", ""),
        report.get("date_posted", ""),
        report.get("raw_content", "")
    )

    return report


def scrape_all_reports(max_pages: Optional[int] = None, delay: float = 1.0, authenticate: bool = True):
    """
    Scrape all fishing reports from the website.

    Args:
        max_pages: Maximum number of pages to scrape (None for all)
        delay: Delay between requests in seconds
        authenticate: Whether to log in for full access to historical reports
    """
    init_database()
    session = create_session(authenticate=authenticate)

    records_per_page = 50  # Request more per page for efficiency
    start_row = 1
    page = 1
    total_scraped = 0
    total_inserted = 0
    consecutive_empty = 0

    print("Starting scrape of Delavan Lake fishing reports...")

    # First request to get total count
    reports, total_count = scrape_page(session, start_row, records_per_page)

    if total_count == 0:
        print("Could not determine total report count. Will scrape until no more reports found.")
        total_count = float("inf")
    else:
        print(f"Total reports to scrape: {total_count:,}")

    total_pages = (total_count // records_per_page) + 1 if total_count != float("inf") else "unknown"

    while True:
        if max_pages and page > max_pages:
            print(f"Reached max pages limit ({max_pages})")
            break

        print(f"Scraping page {page}/{total_pages} (records {start_row}-{start_row + records_per_page - 1})...")

        if page > 1:  # We already got page 1
            time.sleep(delay)
            reports, _ = scrape_page(session, start_row, records_per_page)

        if not reports:
            consecutive_empty += 1
            if consecutive_empty >= 3:
                print("3 consecutive empty pages, stopping.")
                break
            print(f"  No reports on this page (empty streak: {consecutive_empty})")
            start_row += records_per_page
            page += 1
            continue

        consecutive_empty = 0

        for report in reports:
            total_scraped += 1
            result = insert_raw_report(
                source_id=report.get("source_id"),
                date_posted=report.get("date_posted"),
                username=report.get("username"),
                raw_content=report.get("raw_content"),
                weather_badge=report.get("weather_badge"),
                location_tag=report.get("location_tag"),
                image_urls=report.get("image_urls")
            )
            if result:
                total_inserted += 1

        print(f"  Scraped {len(reports)} reports, {total_inserted} new insertions so far")

        start_row += records_per_page
        page += 1

        # Safety check - if we've gone past the total
        if start_row > total_count:
            break

    print(f"\nScraping complete!")
    print(f"Total reports scraped: {total_scraped}")
    print(f"New reports inserted: {total_inserted}")

    stats = get_stats()
    print(f"Database now contains {stats['raw_reports']} raw reports")


def scrape_sample(num_pages: int = 5):
    """Scrape a sample of reports for testing."""
    print(f"Scraping {num_pages} pages as a sample...")
    scrape_all_reports(max_pages=num_pages, delay=0.5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Delavan Lake fishing reports")
    parser.add_argument("--pages", type=int, default=None, help="Max pages to scrape (default: all)")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests in seconds")
    parser.add_argument("--sample", action="store_true", help="Scrape only 5 pages as a sample")
    parser.add_argument("--no-auth", action="store_true", help="Skip authentication (limited to recent reports)")

    args = parser.parse_args()

    if args.sample:
        scrape_sample()
    else:
        scrape_all_reports(max_pages=args.pages, delay=args.delay, authenticate=not args.no_auth)
