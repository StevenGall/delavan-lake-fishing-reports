# Delavan Lake Fishing Reports

## Environment
- `python3` not `python` — macOS has no `python` alias
- Backend: `cd backend && source .venv/bin/activate` or use `./pw` wrapper (pyprojectx + uv)
- Frontend: `cd frontend && yarn dev` (Vite on :5173)
- Backend server: `cd backend && ./pw serve` (uvicorn on :8000)

## Data Quirks
- Species stored as comma-separated combos ("Bluegill, Crappie") — always split and normalize with `.title()` for case consistency
- SQLite numeric fields (water_temp_f, air_temp_f, water_depth_feet) may contain strings — coerce with `float()` + try/except
- Database seeder: `cd backend && python3 seeder.py seed` populates from seed_data.json (18,594 reports)
- 25 years of data (2001-2026), sparse fields: depth 18%, water temp 3.4%, weather 22%

## Frontend
- Tailwind CSS v4 via `@tailwindcss/vite` — theme colors in `frontend/src/index.css` as CSS variables (--color-lake-*, --color-forest-*, --color-sand-*, --color-catch-*)
- No tailwind.config file — config is CSS-native
- Recharts for charts — use dark tooltip style: `{ backgroundColor: 'var(--color-gray-800, #1f2937)', border: 'none', borderRadius: '8px', color: '#fff' }`
- UI primitives in `frontend/src/components/ui/`: Card, Badge, StatCard, LoadingState
- React Query hooks in `frontend/src/hooks/useQueries.ts`
- API client in `frontend/src/api.ts`
- TypeScript strict mode — `npx tsc --noEmit` must pass with zero errors

## Backend
- FastAPI app in `backend/api.py`
- Location normalization: `backend/location_mapper.py` maps free-text to 15 canonical zones
- Smart recommendations: `backend/recommender.py` with multi-dimensional scoring

## Git
- Commit style: imperative mood, summary line + bullet details
