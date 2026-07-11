# Deployment Guide — Weather Data Platform Medan

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Compose (Full Stack)](#docker-compose-full-stack)
- [Vercel Deployment (Frontend)](#vercel-deployment-frontend)
- [Docker VPS Deployment](#docker-vps-deployment)
- [Environment Variables Reference](#environment-variables-reference)
- [Healthcheck Endpoints](#healthcheck-endpoints)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool              | Version | Purpose                      |
| ----------------- | ------- | ---------------------------- |
| Docker + Compose  | v24+    | Container orchestration      |
| Node.js           | 20+     | Frontend build               |
| Python            | 3.11+   | ETL (local dev only)         |
| PostgreSQL client | 16      | Database admin (optional)    |

---

## Local Development

### 1. Clone & setup

```bash
git clone https://github.com/<user>/weather-data-platform.git
cd weather-data-platform
cp .env.example .env        # edit credentials as needed
```

### 2. Start database

```bash
docker compose -f docker/docker-compose.yml up -d postgres
```

### 3. Run migrations

```bash
cd apps/landing
npm install
npx prisma migrate dev
npx prisma generate
```

### 4. Start frontend

```bash
npm run dev
# → http://localhost:3000
```

### 5. Run ETL (Python)

```bash
cd etl
pip install -r requirements.txt
python -m etl.extract.run
python -m etl.transform.run
python -m etl.load.run
```

---

## Docker Compose (Full Stack)

Runs all services in containers with a single command.

### Quick start

```bash
cp .env.example .env        # edit credentials
docker compose -f docker/docker-compose.yml up -d --build
```

### Services & ports

| Service            | Port | URL                            |
| ------------------ | ---- | ------------------------------ |
| PostgreSQL         | 5432 | `localhost:5432`               |
| Airflow Webserver  | 8080 | http://localhost:8080          |
| Metabase           | 3000 | http://localhost:3000          |
| Landing Page       | 3001 | http://localhost:3001          |

### Airflow credentials (default)

| Field    | Value        |
| -------- | ------------ |
| Username | `admin`      |
| Password | `admin`      |

Change `AIRFLOW_WEBSERVER_SECRET_KEY` in `.env` for production.

### Run ETL manually

```bash
docker compose -f docker/docker-compose.yml --profile etl run --rm etl-runner
```

### View logs

```bash
docker compose -f docker/docker-compose.yml logs -f <service>
```

### Stop everything

```bash
docker compose -f docker/docker-compose.yml down        # keep data
docker compose -f docker/docker-compose.yml down -v      # ⚠️ delete volumes
```

---

## Vercel Deployment (Frontend)

The landing page (`apps/landing`) deploys to Vercel as a standalone Next.js app.

### Setup

1. Push repo to GitHub.
2. Import project in [vercel.com](https://vercel.com).
3. Set **Root Directory** to `apps/landing`.
4. Set **Framework Preset** → Next.js (auto-detected).
5. Add environment variable:

   | Key            | Value                                         |
   | -------------- | --------------------------------------------- |
   | `DATABASE_URL` | `postgresql://user:pass@your-vps:5432/weather_dwh` |

6. Deploy.

### Notes

- Vercel builds use `output: "standalone"` (set in `next.config.ts`).
- Prisma generates during build — `DATABASE_URL` must be set as a **build env var** if using Prisma migrate at build time.
- For production, use a connection pooler (PgBouncer) or Prisma Accelerate if the database is behind a firewall.

---

## Docker VPS Deployment

For deploying the backend data stack (Postgres, Airflow, Metabase, ETL) on a VPS.

### 1. Provision VPS

- Ubuntu 22.04+ / Debian 12+
- 2 vCPU, 4 GB RAM minimum
- Docker & Docker Compose installed

### 2. Clone & configure

```bash
git clone https://github.com/<user>/weather-data-platform.git
cd weather-data-platform
cp .env.example .env
```

Edit `.env`:

```bash
POSTGRES_PASSWORD=<strong-password>
AIRFLOW_WEBSERVER_SECRET_KEY=<random-secret>
WEATHER_PROVIDER=bmkg
```

### 3. Start services

```bash
cd docker
docker compose up -d --build
```

### 4. Verify health

```bash
docker compose ps                  # all services "Up" + "(healthy)"
curl http://localhost:8080/health  # Airflow
curl http://localhost:3000/api/health  # Metabase
curl http://localhost:3001/api/health  # Landing
```

### 5. Configure firewall

```bash
# Allow only needed ports
ufw allow 22/tcp     # SSH
ufw allow 8080/tcp   # Airflow (restrict to admin IPs in production)
ufw allow 3000/tcp   # Metabase (restrict to admin IPs)
ufw allow 3001/tcp   # Landing page (public)
ufw enable
```

### 6. Reverse proxy (optional)

For production, put Nginx/Caddy in front:

```nginx
server {
    listen 80;
    server_name cuaca.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /admin/metabase/ {
        proxy_pass http://localhost:3000/;
    }

    location /admin/airflow/ {
        proxy_pass http://localhost:8080/;
    }
}
```

---

## Environment Variables Reference

| Variable                        | Default                    | Description                      |
| ------------------------------- | -------------------------- | -------------------------------- |
| `DATABASE_URL`                  | `postgresql://cuaca:...`   | Prisma connection string         |
| `POSTGRES_USER`                 | `cuaca`                    | PostgreSQL superuser             |
| `POSTGRES_PASSWORD`             | `password123`              | PostgreSQL password              |
| `POSTGRES_DB`                   | `weather_dwh`              | Database name                    |
| `POSTGRES_PORT`                 | `5432`                     | Host-mapped port                 |
| `WEATHER_PROVIDER`              | `bmkg`                     | `bmkg` / `openweather` / `mock`  |
| `OPENWEATHER_API_KEY`           | *(empty)*                  | Required if provider=openweather |
| `ETL_SCHEDULE_INTERVAL_MINUTES` | `10`                       | Airflow DAG interval             |
| `AIRFLOW__CORE__EXECUTOR`       | `LocalExecutor`            | Airflow executor                 |
| `AIRFLOW_UID`                   | `50000`                    | Airflow container UID            |
| `AIRFLOW_WEBSERVER_SECRET_KEY`  | `change-me-in-production`  | Flask secret for Airflow UI      |
| `AIRFLOW_WEBSERVER_PORT`        | `8080`                     | Airflow UI port                  |
| `METABASE_PORT`                 | `3000`                     | Metabase UI port                 |
| `LANDING_PORT`                  | `3001`                     | Landing page port                |

---

## Healthcheck Endpoints

| Service   | Endpoint                          | Expected Response              |
| --------- | --------------------------------- | ------------------------------ |
| Landing   | `GET /api/health`                 | `{"status":"ok","timestamp":…}` |
| Airflow   | `GET http://localhost:8080/health`| `{"status": "healthy"}`        |
| Metabase  | `GET http://localhost:3000/api/health` | `{"status":"ok"}`         |
| PostgreSQL| `pg_isready` (via Docker healthcheck)  | exit 0                   |

All services include Docker `healthcheck` directives. Use `docker compose ps` to see status.

---

## Troubleshooting

| Symptom                           | Cause                              | Fix                                    |
| --------------------------------- | ---------------------------------- | -------------------------------------- |
| Airflow webserver keeps restarting| DB migration slow on first start   | Wait 60–120s, check logs               |
| Metabase blank page               | Still initializing (1–2 min)       | Check `docker compose logs metabase`   |
| Landing build fails               | `DATABASE_URL` not set at build    | Set as build arg or env during build   |
| ETL connection refused            | Postgres not healthy yet           | Check `docker compose ps` postgres     |
| Port conflict                     | Host port already in use           | Change port in `.env`                  |
