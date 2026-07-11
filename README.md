# Weather Data Platform Medan

Platform data cuaca Kota Medan — portfolio Junior Data Engineer.

## Tech Stack

| Layer     | Tools                                        |
| --------- | -------------------------------------------- |
| Frontend  | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| Backend   | Next.js Route Handlers                       |
| ETL       | Python 3.11+, Pandas, Requests               |
| Scheduler | Apache Airflow                               |
| Database  | PostgreSQL (Star Schema)                     |
| ORM       | Prisma                                       |
| Dashboard | Metabase                                     |
| Container | Docker, Docker Compose                       |

## Quick Start

```bash
# 1. Start database
docker compose -f docker/docker-compose.yml up -d

# 2. Install & run frontend
cd apps/landing
npm install
npm run dev

# 3. Setup ETL (Python)
cd etl
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Project Structure

```
├── apps/landing/          # Next.js landing page + API
├── etl/                   # Python ETL pipeline
│   ├── extract/           # WeatherProvider adapters
│   ├── transform/         # Data cleaning & feature engineering
│   ├── load/              # Incremental load to DWH
│   └── dags/              # Airflow DAGs
├── database/schema/       # SQL DDL & migrations
├── docker/                # Docker Compose configs
├── dashboard/             # Metabase config
└── docs/                  # Architecture & deployment docs
```

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Backlog](docs/backlog.md)
