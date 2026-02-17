# Delavan Lake Fishing Reports

A web application that scrapes, processes, and displays historical fishing reports from Delavan Lake, Wisconsin. Uses OpenAI GPT to extract structured fishing data from unstructured reports.

## Features

- **Web Scraper**: Scrapes fishing reports from Lake-Link.com
- **LLM Processing**: Uses OpenAI GPT to extract structured data (species, location, bait, weather, etc.)
- **REST API**: FastAPI backend for querying processed data
- **React Frontend**: Interactive dashboard with filtering, search, and map view

## Project Structure

```
├── backend/
│   ├── pw               # pyprojectx wrapper (bootstraps uv automatically)
│   ├── pyproject.toml   # Project config, dependencies, and pw aliases
│   ├── database.py      # SQLite database operations
│   ├── scraper.py       # Web scraper for Lake-Link
│   ├── processor.py     # LLM data extraction
│   ├── api.py           # FastAPI REST API
│   └── .env.example     # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── api.ts       # API client
│   │   └── types.ts     # TypeScript types
│   └── package.json
└── README.md
```

## Setup

### Prerequisites

- Python 3.14+
- Node.js 18+
- OpenAI API key
- Lake-Link account (see [Lake-Link Account Tiers](#lake-link-account-tiers))

No other tooling needs to be installed. The `pw` wrapper script automatically bootstraps [uv](https://github.com/astral-sh/uv) via [pyprojectx](https://github.com/pyprojectx/pyprojectx) on first run.

### Backend Setup

1. Install dependencies (automatically creates a venv and installs everything):
   ```bash
   cd backend
   ./pw install
   ```

2. Create `.env` file with your credentials:
   ```bash
   cp .env.example .env
   # Edit .env and add your keys
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   yarn install
   ```

2. (Optional) Create `.env` file for Google Maps:
   ```bash
   cp .env.example .env
   # Edit .env and add your VITE_GOOGLE_MAPS_API_KEY
   ```

## Lake-Link Account Tiers

The scraper authenticates with Lake-Link.com to access fishing reports. The amount of data available depends on your account tier:

| Tier | Cost | Access |
|------|------|--------|
| **Free account** | Free | ~225 most recent reports only |
| **Lake-Link Pro** | $2.99 | Full historical archive (18,000+ reports dating back to 2003) |

A free account is sufficient for testing, but a Pro subscription is needed to scrape the full dataset. Sign up at [lake-link.com/login](https://www.lake-link.com/login/) and upgrade at [lake-link.com/upgrade](https://www.lake-link.com/upgrade/) if needed.

## Usage

All commands are run from the `backend/` directory using the `./pw` wrapper.

### 1. Scrape Fishing Reports

```bash
cd backend

# Scrape a sample (5 pages)
./pw scrape-sample

# Scrape all reports (requires Lake-Link Pro for full archive)
./pw scrape

# Scrape without authentication (recent reports only)
./pw scrape-noauth
```

### 2. Process Reports with LLM

```bash
cd backend

# Process a sample (10 reports)
./pw process -- --sample

# Process all unprocessed reports
./pw process

# Process with custom batch size
./pw process -- --batch 50 --max 500
```

### 3. Start the API Server

```bash
cd backend
./pw serve
```

The API will be available at http://localhost:8000

### 4. Start the Frontend

```bash
cd frontend
yarn dev
```

The frontend will be available at http://localhost:5173

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /reports` | Get all processed reports |
| `GET /reports/month/{month}` | Get reports for a specific month (1-12) |
| `GET /reports/species/{species}` | Get reports for a specific species |
| `GET /reports/search` | Search with filters (month, season, species, location, weather) |
| `GET /stats` | Get database statistics |
| `GET /species` | Get list of all species with counts |
| `GET /locations` | Get location statistics |
| `GET /months` | Get monthly statistics |
| `GET /recommendations` | Get fishing recommendations by month |

## Data Extracted

The LLM extracts the following information from each report:

- **Date/Month/Season**: When the fishing occurred
- **Species Caught/Targeted**: What fish were caught or being targeted
- **Bait/Lure**: What bait or lures were used
- **Location**: Where on the lake
- **Water Depth**: How deep the water was
- **Water Temperature**: Temperature of the water
- **Air Temperature**: Outside temperature
- **Weather Conditions**: Sunny, cloudy, rainy, etc.
- **Ice Thickness**: For ice fishing reports

## Tech Stack

- **Backend**: Python, FastAPI, SQLite, BeautifulSoup, OpenAI API
- **Frontend**: React, TypeScript, Vite, Google Maps API

## License

For educational purposes only. Data sourced from Lake-Link.com.
