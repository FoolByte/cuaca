# CLAUDE.md — Weather Data Platform Medan

Instruksi ini dibaca oleh Claude Code di awal setiap sesi. Sumber kebenaran untuk scope & fase kerja ada di `PRD.md` — dokumen ini berisi aturan main, konvensi, dan status progres.

## Ringkasan Project

Platform data cuaca Kota Medan (portfolio Junior Data Engineer): ETL Python → PostgreSQL Data Warehouse (star schema) → Apache Airflow scheduler → Dashboard Metabase (admin) → Landing page Next.js (publik).

## Aturan Kerja dengan PRD

1. **Selalu baca `PRD.md` dan tabel Phase Tracking di bawah sebelum mulai coding.**
2. Kerjakan **hanya fase yang berstatus `In Progress`**. Jangan mulai fase berikutnya sebelum _Acceptance Criteria_ fase aktif terpenuhi.
3. Setelah fase selesai dan acceptance criteria lolos: update tabel Phase Tracking (`Not Started` → `Done`), lalu commit.
4. Jika suatu task butuh keputusan yang tidak dijelaskan di PRD, ambil keputusan paling sederhana yang konsisten dengan Clean Architecture, catat asumsi di commit message atau `docs/architecture.md`, lalu lanjutkan — jangan berhenti menunggu konfirmasi kecuali keputusan itu destruktif (mis. menghapus data, mengubah schema yang sudah ada data).
5. Belum punya API key BMKG/OpenWeather asli? Gunakan mock provider (`MockWeatherProvider`) yang mengikuti interface `WeatherProvider` yang sama — jangan skip fase ETL karena ini.

## Phase Tracking

| Fase | Nama                             | Status      | Catatan |
| ---- | -------------------------------- | ----------- | ------- |
| 0    | Foundation & Project Setup       | Done        |         |
| 1    | Data Warehouse Schema            | Done        |         |
| 2    | ETL: Extract                     | Done        |         |
| 3    | ETL: Transform                   | Done        |         |
| 4    | ETL: Load (Incremental)          | Done        |         |
| 5    | Scheduler: Apache Airflow        | Done        |         |
| 6    | Dashboard Analytics (Metabase)   | Done        |         |
| 7    | Backend API Layer                | Done        |         |
| 8    | Landing Page                     | Done        |         |
| 9    | Dockerization & Deployment       | Not Started |         |
| 10   | Documentation & Portfolio Polish | Not Started |         |

Status yang valid: `Not Started`, `In Progress`, `Blocked`, `Done`. Update tabel ini sebagai bagian dari commit setiap kali fase berubah status.

## Tech Stack & Versi

| Layer     | Tools                                                                           |
| --------- | ------------------------------------------------------------------------------- |
| Frontend  | Next.js 16, TypeScript (strict), Tailwind CSS, shadcn/ui, Leaflet / MapLibre GL |
| Backend   | Next.js Route Handlers                                                          |
| ETL       | Python 3.11+, Pandas, Requests                                                  |
| Scheduler | Apache Airflow                                                                  |
| Database  | PostgreSQL                                                                      |
| ORM       | Prisma                                                                          |
| Dashboard | Metabase                                                                        |
| Container | Docker, Docker Compose                                                          |

## Folder Structure

```
weather-data-platform/
├── apps/landing/          # Next.js app: landing page + API route handlers
├── etl/
│   ├── extract/           # WeatherProvider interface + adapters (BMKG, OpenWeather, Mock)
│   ├── transform/         # cleaning, standardization, feature engineering, anomaly, prediksi
│   ├── load/               # incremental load ke PostgreSQL
│   └── dags/                # Airflow DAGs
├── database/schema/       # SQL DDL, migration, seed
├── docker/                 # docker-compose.yml + Dockerfiles
├── dashboard/              # Metabase config/export
├── docs/                    # architecture.md, deployment.md, backlog.md
├── CLAUDE.md
├── PRD.md
└── README.md
```

## Arsitektur — Prinsip Wajib

- **Adapter pattern untuk data source.** Semua provider cuaca (BMKG, OpenWeather, Mock) mengimplementasikan interface `WeatherProvider` yang sama. Kode di luar `etl/extract/` **tidak boleh** tahu field spesifik BMKG atau OpenWeather — hanya tahu bentuk data hasil normalisasi adapter.
- **ETL terpisah dari serving layer.** `etl/` adalah package Python mandiri yang menulis ke Postgres. `apps/landing` hanya membaca dari Postgres lewat Prisma (read-only terhadap DWH), tidak pernah menulis ke fact/dim table.
- **Star schema adalah kontrak.** Perubahan schema (`fact_weather`, `dim_time`, `dim_location`, `dim_weather`) harus lewat migration di `database/schema/`, dan `schema.prisma` di-update mengikuti.
- **Konfigurasi, bukan hardcode.** Provider aktif, threshold klasifikasi cuaca, dan interval scheduler harus bisa diubah lewat `.env`/config, tanpa mengubah kode.
- **Tidak ada penghapusan data historis.** Tidak ada `DELETE`/auto-purge pada `fact_weather` di kode manapun, kecuali diminta eksplisit oleh user.

## Environment Variables (`.env.example`)

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/weather_dwh

# Weather Provider
WEATHER_PROVIDER=bmkg          # bmkg | openweather | mock (bmkg = public API, no key)
OPENWEATHER_API_KEY=

# Scheduler
ETL_SCHEDULE_INTERVAL_MINUTES=10

# Airflow
AIRFLOW__CORE__EXECUTOR=LocalExecutor
AIRFLOW_UID=50000
```

## Perintah Umum

```bash
# Jalankan seluruh stack
docker compose -f docker/docker-compose.yml up -d

# Landing page (dev)
cd apps/landing && npm run dev

# Prisma
cd apps/landing && npx prisma migrate dev
cd apps/landing && npx prisma generate

# ETL manual run
cd etl && python -m extract.run
cd etl && python -m transform.run
cd etl && python -m load.run

# Test Python
cd etl && pytest

# Test/lint frontend
cd apps/landing && npm run lint && npm run test
```

## Konvensi Kode

- **Python:** PEP8, type hints wajib di fungsi publik, format dengan `black`/`ruff`, unit test dengan `pytest` untuk setiap fungsi transform (cleaning, klasifikasi, anomaly, prediksi).
- **TypeScript:** strict mode, tidak ada `any` tanpa alasan jelas, ESLint + Prettier.
- **SQL:** snake_case untuk semua tabel/kolom, semua foreign key eksplisit dengan constraint.
- **Commit message:** Conventional Commits — `feat(phase2): implement BMKG extractor`, `fix(transform): handle missing humidity value`, `docs: update phase tracking`.

## Do's & Don'ts untuk Claude Code

**DO**

- Kerjakan satu fase per sesi sesuai `PRD.md`.
- Tulis unit test untuk logika transform (klasifikasi, anomaly detection, prediksi sederhana).
- Jaga provider cuaca tetap bisa ditukar lewat config (lihat Arsitektur).
- Update tabel Phase Tracking di file ini setiap fase selesai.

**DON'T**

- Jangan hapus/timpa data historis tanpa instruksi eksplisit.
- Jangan lompat ke fase berikutnya sebelum acceptance criteria fase aktif terpenuhi.
- Jangan commit `.env` atau secret apa pun.
- Jangan hardcode field spesifik satu provider cuaca di luar folder `etl/extract/`.

## Definition of Done (per Fase)

Sebuah fase dianggap selesai jika:

1. Semua task checklist di `PRD.md` untuk fase tersebut tercentang.
2. Semua _Acceptance Criteria_ fase tersebut terverifikasi (dijalankan, bukan diasumsikan).
3. Tabel Phase Tracking di file ini di-update.
4. Perubahan sudah di-commit dengan pesan yang jelas.

## Referensi

- `PRD.md` — scope lengkap & detail tiap fase
- `docs/architecture.md` — diagram arsitektur (diisi Phase 10)
- `docs/deployment.md` — panduan deployment (diisi Phase 9)
- `docs/backlog.md` — Future Enhancement, di luar scope fase 0–10
