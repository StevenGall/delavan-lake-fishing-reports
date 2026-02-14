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
│   ├── database.py      # SQLite database operations
│   ├── scraper.py       # Web scraper for Lake-Link
│   ├── processor.py     # LLM data extraction
│   ├── api.py           # FastAPI REST API
│   └── requirements.txt
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

- Python 3.10+
- Node.js 18+
- OpenAI API key

### Backend Setup

1. Create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create `.env` file with your OpenAI API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

4. Initialize the database:
   ```bash
   python database.py
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

## Usage

### 1. Scrape Fishing Reports

```bash
cd backend

# Scrape a sample (5 pages)
python scraper.py --sample

# Scrape all reports (this may take a while - ~18,000+ reports)
python scraper.py

# Scrape with custom options
python scraper.py --pages 100 --delay 1.5
```

### 2. Process Reports with LLM

```bash
cd backend

# Process a sample (10 reports)
python processor.py --sample

# Process all unprocessed reports
python processor.py

# Process with custom batch size
python processor.py --batch 50 --max 500
```

### 3. Start the API Server

```bash
cd backend
python api.py
# Or with uvicorn for development:
uvicorn api:app --reload
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
