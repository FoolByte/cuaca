# PRODUCT REQUIREMENT DOCUMENT (PRD)

# Weather Data Platform Medan — Phased Edition (Claude Code CLI Ready)

Version: 2.0 (turunan dari PRD v1.0, dipecah per fase untuk agentic coding loop)

---

## 0. Cara Menggunakan Dokumen Ini dengan Claude Code

Dokumen ini didesain agar bisa dikerjakan **satu fase per sesi Claude Code**, bukan sekaligus dalam satu prompt besar. Ini penting karena:

- Project ini punya banyak moving part (ETL, Airflow, Data Warehouse, Dashboard, Landing Page) yang kalau digabung dalam satu context window akan membuat Claude kehilangan detail.
- Setiap fase punya _acceptance criteria_ yang jelas, sehingga hasil kerja bisa diverifikasi sebelum lanjut ke fase berikutnya.

**Aturan loop:**

1. Di awal setiap sesi, minta Claude Code membaca `PRD.md` (fase yang sedang aktif) dan `CLAUDE.md`.
2. Kerjakan hanya fase yang aktif. Jangan lompat ke fase berikutnya sebelum _Acceptance Criteria_ fase saat ini terpenuhi.
3. Setelah fase selesai, update tabel **Phase Tracking** di `CLAUDE.md`, commit dengan pesan `feat(phaseX): ...`, baru pindah ke fase berikutnya.
4. Jika API key (BMKG/OpenWeather) belum tersedia, gunakan mock provider agar development tidak terblokir — jangan skip fase ETL.
5. Setiap fase idealnya = 1 sesi Claude Code. Fase yang lebih kompleks (Transform, Landing Page) boleh 2–3 sesi, dipecah lagi per task checklist di dalamnya.

---

## 1. Project Overview

**Nama Project:** Weather Data Platform Medan

**Tujuan Project:** Membangun platform pengolahan data cuaca Kota Medan yang menunjukkan kemampuan Data Engineer melalui implementasi ETL Pipeline, Data Warehouse, Dashboard Analytics, dan Landing Page Informasi Cuaca. Ditujukan sebagai portfolio profesional untuk melamar posisi **Junior Data Engineer**.

---

## 2. Objectives

- Extract data dari Weather API
- Transform data menjadi data analytics
- Load ke PostgreSQL Data Warehouse
- Scheduler menggunakan Apache Airflow
- Menyimpan historical data tanpa batas
- Menyediakan Dashboard Operasional
- Menyediakan Landing Page untuk masyarakat
- Menunjukkan implementasi Data Warehouse (Star Schema)

---

## 3. Target Users

**Internal — Admin Operasional**

- Monitoring data cuaca & pipeline ETL
- Analisis tren cuaca, melihat statistik

**External — Masyarakat umum & Wisatawan**

- Melihat informasi cuaca Kota Medan via landing page

---

## 4. Tech Stack

| Layer           | Tools                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| Frontend        | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Leaflet / MapLibre GL |
| Backend         | Next.js Route Handlers                                                 |
| ETL             | Python, Pandas, Requests                                               |
| Scheduler       | Apache Airflow                                                         |
| Database        | PostgreSQL                                                             |
| ORM             | Prisma                                                                 |
| Dashboard       | Metabase                                                               |
| Container       | Docker, Docker Compose                                                 |
| Version Control | Git, GitHub                                                            |
| Deployment      | Vercel (frontend), Docker VPS (backend/data stack)                     |

---

## 5. Folder Structure (Final)

```
weather-data-platform/
├── apps/
│   └── landing/                 # Next.js 16 app (landing page + API route handlers)
│       ├── app/
│       ├── prisma/
│       └── ...
├── etl/
│   ├── extract/                 # WeatherProvider interface + BMKG/OpenWeather adapters
│   ├── transform/                # cleaning, standardization, feature engineering
│   ├── load/                     # incremental load ke PostgreSQL
│   └── dags/                     # Airflow DAG definitions
├── database/
│   └── schema/                   # SQL DDL, migration, seed script
├── docker/
│   ├── docker-compose.yml
│   └── (Dockerfile per service)
├── dashboard/                    # Metabase config/export (jika ada)
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   └── backlog.md
├── CLAUDE.md
├── PRD.md
└── README.md
```

---

## 6. Data Source

**Prioritas:** BMKG API
**Alternatif:** OpenWeather API

Data harus dapat diganti tanpa mengubah keseluruhan arsitektur aplikasi → diimplementasikan lewat **adapter pattern**: interface `WeatherProvider` dengan implementasi `BMKGProvider` dan `OpenWeatherProvider`, dipilih via konfigurasi (bukan hardcode).

---

## 7. Data Warehouse Design (Star Schema)

### fact_weather

| Kolom                          | Tipe              | Keterangan             |
| ------------------------------ | ----------------- | ---------------------- |
| fact_weather_id                | SERIAL PK         |                        |
| time_id                        | FK → dim_time     |                        |
| location_id                    | FK → dim_location |                        |
| weather_id                     | FK → dim_weather  |                        |
| temperature                    | NUMERIC           | suhu (°C)              |
| humidity                       | NUMERIC           | kelembaban (%)         |
| pressure                       | NUMERIC           | tekanan udara (hPa)    |
| wind_direction                 | VARCHAR           | arah angin             |
| wind_speed                     | NUMERIC           | kecepatan angin (km/h) |
| rainfall                       | NUMERIC           | curah hujan (mm)       |
| uv_index                       | NUMERIC           | indeks UV              |
| visibility                     | NUMERIC           | jarak pandang (km)     |
| cloud_coverage                 | NUMERIC           | tutupan awan (%)       |
| temp_avg / temp_max / temp_min | NUMERIC           | agregat per periode    |
| source                         | VARCHAR           | BMKG / OpenWeather     |
| created_at                     | TIMESTAMP         |                        |

Unique constraint: `(time_id, location_id)` — mencegah duplikasi saat incremental load.

### dim_time

`time_id, timestamp, date, hour, day, month, year, day_of_week, is_weekend`

### dim_location

`location_id, city, district (kecamatan), latitude, longitude, region_level`
→ diseed dengan 21 kecamatan Kota Medan agar heatmap kecamatan bisa langsung jalan.

### dim_weather

`weather_id, condition_code, condition_desc, temp_classification, humidity_classification, wind_classification, rain_classification`

### Staging (di luar star schema)

`raw_weather_observations` — landing zone data mentah dari Extract, sebelum masuk proses Transform/Load.

---

## 8. Scheduler

Default: setiap 10 menit. Interval **harus** dapat diubah lewat konfigurasi (Airflow Variable / `.env`), tanpa mengubah kode DAG.

---

## 9. Data Storage

Semua data disimpan, tidak ada penghapusan otomatis. Historical data dipakai untuk Trend Analysis, Heatmap, Weather Prediction, dan Analytics.

---

## 10. PEMBAGIAN FASE

### Phase 0 — Foundation & Project Setup

**Goal:** Menyiapkan struktur repo, tooling, dan environment dasar.

**Tasks:**

- [ ] Init git repo, `.gitignore`, `README.md` skeleton
- [ ] Buat folder structure sesuai Section 5
- [ ] `docker-compose.yml` dasar: service PostgreSQL kosong
- [ ] `.env.example` (DB credentials, API keys, scheduler interval, dsb.)
- [ ] Setup Python environment untuk `etl/` (`pyproject.toml`/`requirements.txt`)
- [ ] Setup Next.js 16 project di `apps/landing` (TypeScript, Tailwind, shadcn/ui)
- [ ] Buat `docs/architecture.md` (kosong, diisi di Phase 10)
- [ ] Linter dasar: ruff/black (Python), ESLint/Prettier (TS)

**Acceptance Criteria:**

- `docker compose up -d` menjalankan Postgres tanpa error
- `npm run dev` di `apps/landing` menampilkan halaman default
- Struktur folder sesuai Section 5

**Dependencies:** —
**Estimasi sesi:** 1

---

### Phase 1 — Data Warehouse Schema

**Goal:** Implementasi star schema di PostgreSQL.

**Tasks:**

- [ ] Finalisasi ERD (lihat Section 7)
- [ ] SQL DDL di `database/schema/`
- [ ] `schema.prisma` merepresentasikan tabel yang sama
- [ ] Migration awal (Prisma migrate / raw SQL migration)
- [ ] Seed `dim_location` dengan 21 kecamatan Kota Medan + koordinat
- [ ] Buat tabel staging `raw_weather_observations`

**Acceptance Criteria:**

- Semua tabel terbentuk via migration, FK valid
- `dim_location` terisi 21 kecamatan
- `npx prisma generate` sukses tanpa error

**Dependencies:** Phase 0
**Estimasi sesi:** 1–2

---

### Phase 2 — ETL: Extract

**Goal:** Modul extract dari BMKG API (fallback OpenWeather) dengan adapter pattern.

**Tasks:**

- [ ] Interface `WeatherProvider` (abstract class) — method `fetch_current(location)`
- [ ] Implementasi `BMKGProvider` dan `OpenWeatherProvider`
- [ ] Config loader untuk memilih provider aktif tanpa mengubah kode inti
- [ ] Ambil field wajib: suhu, kelembaban, tekanan udara, arah angin, kecepatan angin, curah hujan, indeks UV, jarak pandang, awan, kondisi cuaca, waktu observasi
- [ ] Simpan raw response ke `raw_weather_observations` (idempotent, timestamped)
- [ ] Logging & retry (max retry, backoff)
- [ ] Unit test parsing response tiap provider (mock API)

**Acceptance Criteria:**

- `python -m etl.extract.run` berhasil insert data mentah
- Switch provider hanya via config, tanpa ubah kode inti
- Semua field wajib tertangkap (null-safe jika provider tak menyediakan)

**Dependencies:** Phase 1
**Estimasi sesi:** 2

---

### Phase 3 — ETL: Transform

**Goal:** Cleaning, standardization, feature engineering, analisis.

**Tasks:**

- [ ] Cleaning: missing value, duplicate, invalid value
- [ ] Standardization: format waktu (ISO 8601 / WIB konsisten), format satuan
- [ ] Feature engineering: suhu rata-rata/maks/min, rata-rata kelembaban, rata-rata tekanan
- [ ] Klasifikasi otomatis suhu: Sangat Panas / Panas / Normal / Dingin (threshold terdokumentasi di config)
- [ ] Klasifikasi kelembaban, kecepatan angin, curah hujan
- [ ] Analisis tren (moving average / delta antar periode)
- [ ] Deteksi anomali (z-score / IQR terhadap data historis per lokasi)
- [ ] Prediksi cuaca sederhana (moving average / linear regression)
- [ ] Unit test tiap fungsi transform

**Acceptance Criteria:**

- Data hasil transform bebas duplicate, missing value tervalidasi
- Semua klasifikasi konsisten dengan threshold yang terdokumentasi
- Fungsi anomaly detection & prediction punya test coverage, aman untuk dataset kecil/kosong

**Dependencies:** Phase 2
**Estimasi sesi:** 2–3

---

### Phase 4 — ETL: Load (Incremental)

**Goal:** Load data hasil transform ke Data Warehouse secara incremental.

**Tasks:**

- [ ] Upsert `dim_time`/`dim_location`/`dim_weather` (insert if not exists)
- [ ] Insert `fact_weather` dengan dedup check (unique `time_id + location_id`)
- [ ] Watermark/checkpoint (`last_loaded_timestamp`)
- [ ] Data quality check sebelum load (row count, null check kolom wajib)
- [ ] Transaksi atomik (rollback bila gagal sebagian)
- [ ] Logging hasil load (inserted/updated/skipped)

**Acceptance Criteria:**

- Load dua kali berturut-turut tidak menghasilkan duplikat
- Watermark tersimpan & terbaca benar antar run
- Tidak ada auto-delete data historis

**Dependencies:** Phase 3
**Estimasi sesi:** 1–2

---

### Phase 5 — Scheduler: Apache Airflow

**Goal:** Orkestrasi ETL otomatis dan terjadwal.

**Tasks:**

- [ ] Setup Airflow via Docker Compose (webserver, scheduler, metadata DB terpisah dari DWH)
- [ ] DAG `weather_etl_dag.py` di `etl/dags/`: `extract >> transform >> load`
- [ ] Interval default 10 menit via Airflow Variable/config (dapat diubah tanpa redeploy)
- [ ] Retry per task (`retries`, `retry_delay`) & alerting dasar
- [ ] Airflow Connection ke PostgreSQL DWH (bukan hardcode credential)

**Acceptance Criteria:**

- DAG muncul di Airflow UI, bisa di-trigger manual tanpa error
- DAG berjalan otomatis sesuai interval terkonfigurasi
- Ubah interval via config tidak butuh ubah kode DAG

**Dependencies:** Phase 4
**Estimasi sesi:** 1–2

---

### Phase 6 — Dashboard Analytics (Admin, Metabase)

**Goal:** Dashboard operasional untuk admin.

**Tasks:**

- [ ] Setup Metabase via Docker Compose, connect ke DWH (read-only user)
- [ ] SQL view/query untuk: Overview, Analytics, Trend, Heatmap, Prediction, Anomaly Detection
- [ ] Susun dashboard Metabase per section di atas

**Acceptance Criteria:**

- Semua 6 section tampil dengan data real dari DWH
- Dashboard admin terpisah aksesnya dari landing page publik

**Dependencies:** Phase 4
**Estimasi sesi:** 1–2

---

### Phase 7 — Backend API Layer

**Goal:** REST endpoint (Next.js Route Handlers) untuk landing page.

**Tasks:**

- [ ] Prisma Client read-only terhadap DWH
- [ ] `GET /api/weather/current`
- [ ] `GET /api/weather/forecast`
- [ ] `GET /api/weather/trend`
- [ ] `GET /api/weather/heatmap`
- [ ] Caching sederhana (revalidate mengikuti interval scheduler)
- [ ] Error handling standar (400/404/500)

**Acceptance Criteria:**

- Semua endpoint mengembalikan JSON valid & terdokumentasi
- Response time < 1 detik untuk 1 kota/beberapa kecamatan

**Dependencies:** Phase 4
**Estimasi sesi:** 1–2

---

### Phase 8 — Landing Page (Public)

**Goal:** Landing page modern, responsif, SEO-friendly.

**Tasks:**

- [ ] Halaman: Home, Current Weather, Forecast, Trend Cuaca, Heatmap (Leaflet/MapLibre), Tentang, Kontak
- [ ] Konsumsi API dari Phase 7
- [ ] Styling Tailwind + shadcn/ui
- [ ] SEO: metadata, sitemap.xml, robots.txt, Open Graph
- [ ] Cek responsif: desktop, tablet, mobile

**Acceptance Criteria:**

- Semua 7 halaman menampilkan data real-time dari backend
- Layout responsif di 3 breakpoint utama
- Metadata SEO lengkap di setiap halaman

**Dependencies:** Phase 7
**Estimasi sesi:** 2–3

---

### Phase 9 — Dockerization & Deployment

**Goal:** Seluruh stack berjalan via satu `docker-compose`, siap deploy.

**Tasks:**

- [ ] Finalisasi `docker-compose.yml`: postgres, airflow (webserver+scheduler), metabase, landing app
- [ ] Dockerfile per service yang butuh (etl runner, landing app)
- [ ] Environment variable terpusat via `.env`, tanpa secret hardcoded
- [ ] Deployment guide: Vercel (frontend), Docker VPS (Postgres+Airflow+Metabase+ETL)
- [ ] Healthcheck per service

**Acceptance Criteria:**

- `docker compose up -d` dari root menjalankan seluruh stack tanpa error
- Landing page berhasil / siap deploy ke Vercel
- `docs/deployment.md` tersedia dan lengkap

**Dependencies:** Phase 0–8
**Estimasi sesi:** 1–2

---

### Phase 10 — Documentation & Portfolio Polish

**Goal:** Project siap ditampilkan sebagai portfolio ke recruiter.

**Tasks:**

- [ ] `README.md` lengkap: overview, diagram arsitektur, tech stack, cara run lokal, screenshot
- [ ] `docs/architecture.md`: diagram ETL & data flow (Mermaid)
- [ ] Checklist Success Criteria (Section 12) dicentang satu per satu
- [ ] Mock provider / seed data agar reviewer bisa coba tanpa API key asli
- [ ] (Opsional) demo video/gif pipeline berjalan

**Acceptance Criteria:**

- README bisa diikuti orang baru untuk clone & run project < 15 menit
- Semua item Success Criteria tercentang selesai

**Dependencies:** Phase 0–9
**Estimasi sesi:** 1

---

## 11. Non Functional Requirements

- **Availability:** 99%
- **Responsive:** Desktop, Tablet, Mobile
- **Scalable:** arsitektur mudah dikembangkan (mis. tambah kota lain)
- **Maintainable:** kode mengikuti Clean Architecture, ETL & serving layer terpisah jelas

---

## 12. Success Criteria

Project harus menunjukkan kemampuan:

- [ ] ETL Pipeline
- [ ] PostgreSQL
- [ ] Data Warehouse (Star Schema)
- [ ] Apache Airflow
- [ ] Dashboard Analytics
- [ ] Docker
- [ ] Python
- [ ] SQL
- [ ] Data Modeling

Recruiter dapat memahami bahwa project ini merupakan implementasi nyata seorang Junior Data Engineer.

---

## 13. Future Enhancement (Backlog — di luar scope fase 0–10)

- Machine Learning Prediction
- Air Quality Integration
- Disaster Warning
- Telegram / WhatsApp Notification
- REST API publik + Authentication
- Multi City Support
- Cloud Deployment penuh
- CI/CD
- Data Quality Monitoring & Pipeline Monitoring
- Logging terpusat & Retry Mechanism lanjutan

Pindahkan ke `docs/backlog.md` di Phase 10, jangan dikerjakan sebelum Phase 0–10 selesai.
