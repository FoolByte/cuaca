# Metabase Dashboard Configuration

## Setup

1. Start the stack: `docker compose -f docker/docker-compose.yml up -d`
2. Open Metabase at `http://localhost:3000`
3. Complete initial setup (create admin account)
4. Add database connection:
   - **Database type:** PostgreSQL
   - **Display name:** Weather DWH
   - **Host:** postgres
   - **Port:** 5432
   - **Database name:** weather_dwh
   - **Username:** metabase_ro
   - **Password:** metabase_ro_pass
5. Run the SQL views: execute `database/schema/005_dashboard_views.sql` against the DWH

## Dashboard Sections

| Section | View | Description |
|---------|------|-------------|
| Overview | `vw_dashboard_overview` | Latest weather per location (current conditions) |
| Analytics | `vw_dashboard_analytics` | Aggregated stats: avg/min/max temp, rainfall, etc. |
| Trend | `vw_dashboard_trend` | Moving averages & deltas for trend charts |
| Heatmap | `vw_dashboard_heatmap` | Temperature/rainfall by location with coordinates |
| Prediction | `vw_dashboard_prediction` | Latest observations for trend extrapolation |
| Anomaly | `vw_dashboard_anomaly` | Z-score anomaly detection per location |

## Creating the Dashboard

1. **New Dashboard** → name: "Weather Data Platform Medan"
2. Add questions (cards) for each section:

### Overview
- **Type:** Table
- **Data source:** `vw_dashboard_overview`
- Shows: district, temperature, humidity, wind, condition

### Analytics
- **Type:** Bar chart
- **Data source:** `vw_dashboard_analytics`
- X-axis: district, Y-axis: avg_temperature

### Trend
- **Type:** Line chart
- **Data source:** `vw_dashboard_trend`
- X-axis: timestamp, Y-axis: temp_ma_3h, humidity_ma_3h
- Group by: district

### Heatmap
- **Type:** Map (requires latitude/longitude)
- **Data source:** `vw_dashboard_heatmap`
- Coordinates: latitude, longitude
- Metric: avg_temperature

### Prediction
- **Type:** Table or Line chart
- **Data source:** `vw_dashboard_prediction`
- Shows: district, current_temp, temp_avg, temp_max, temp_min

### Anomaly Detection
- **Type:** Table (sorted by z_score DESC)
- **Data source:** `vw_dashboard_anomaly`
- Conditional formatting: highlight rows where is_anomaly = true

## Access Control

- Metabase admin dashboard runs on port 3000 (internal only)
- Public landing page runs on port 3001 (Next.js)
- Metabase uses a read-only DB user (`metabase_ro`) — no write access to DWH
