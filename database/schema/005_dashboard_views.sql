-- Dashboard views for Metabase (Phase 6)
-- Each view powers one dashboard section.

-- ── 1. Overview: latest weather per location ──────────────────────

CREATE OR REPLACE VIEW vw_dashboard_overview AS
SELECT DISTINCT ON (dl.district)
    dl.district,
    dl.latitude,
    dl.longitude,
    fw.temperature,
    fw.humidity,
    fw.wind_speed,
    fw.wind_direction,
    fw.rainfall,
    fw.cloud_coverage,
    fw.visibility,
    dw.temp_classification,
    dw.humidity_classification,
    dw.wind_classification,
    dw.rain_classification,
    dw.condition_desc,
    dt.timestamp AS observed_at,
    fw.source
FROM fact_weather fw
JOIN dim_time dt ON fw.time_id = dt.time_id
JOIN dim_location dl ON fw.location_id = dl.location_id
JOIN dim_weather dw ON fw.weather_id = dw.weather_id
ORDER BY dl.district, dt.timestamp DESC;

-- ── 2. Analytics: aggregated stats per location ───────────────────

CREATE OR REPLACE VIEW vw_dashboard_analytics AS
SELECT
    dl.district,
    COUNT(*) AS total_observations,
    ROUND(AVG(fw.temperature), 1) AS avg_temperature,
    ROUND(MIN(fw.temperature), 1) AS min_temperature,
    ROUND(MAX(fw.temperature), 1) AS max_temperature,
    ROUND(AVG(fw.humidity), 1) AS avg_humidity,
    ROUND(AVG(fw.wind_speed), 1) AS avg_wind_speed,
    ROUND(AVG(fw.rainfall), 2) AS avg_rainfall,
    ROUND(SUM(fw.rainfall), 2) AS total_rainfall,
    ROUND(AVG(fw.cloud_coverage), 1) AS avg_cloud_coverage,
    MIN(dt.timestamp) AS first_observation,
    MAX(dt.timestamp) AS last_observation
FROM fact_weather fw
JOIN dim_time dt ON fw.time_id = dt.time_id
JOIN dim_location dl ON fw.location_id = dl.location_id
GROUP BY dl.district;

-- ── 3. Trend: hourly moving averages per location ─────────────────

CREATE OR REPLACE VIEW vw_dashboard_trend AS
SELECT
    dl.district,
    dt.date,
    dt.hour,
    dt.timestamp,
    fw.temperature,
    fw.humidity,
    fw.rainfall,
    ROUND(
        AVG(fw.temperature) OVER (
            PARTITION BY dl.district
            ORDER BY dt.timestamp
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ), 1
    ) AS temp_ma_3h,
    ROUND(
        AVG(fw.humidity) OVER (
            PARTITION BY dl.district
            ORDER BY dt.timestamp
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ), 1
    ) AS humidity_ma_3h,
    ROUND(
        AVG(fw.rainfall) OVER (
            PARTITION BY dl.district
            ORDER BY dt.timestamp
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ), 2
    ) AS rainfall_ma_3h,
    ROUND(
        fw.temperature - LAG(fw.temperature) OVER (
            PARTITION BY dl.district ORDER BY dt.timestamp
        ), 1
    ) AS temp_delta,
    ROUND(
        fw.humidity - LAG(fw.humidity) OVER (
            PARTITION BY dl.district ORDER BY dt.timestamp
        ), 1
    ) AS humidity_delta
FROM fact_weather fw
JOIN dim_time dt ON fw.time_id = dt.time_id
JOIN dim_location dl ON fw.location_id = dl.location_id
ORDER BY dl.district, dt.timestamp;

-- ── 4. Heatmap: temperature and rainfall by location ──────────────

CREATE OR REPLACE VIEW vw_dashboard_heatmap AS
SELECT
    dl.district,
    dl.latitude,
    dl.longitude,
    ROUND(AVG(fw.temperature), 1) AS avg_temperature,
    ROUND(AVG(fw.rainfall), 2) AS avg_rainfall,
    ROUND(AVG(fw.humidity), 1) AS avg_humidity,
    dw.temp_classification,
    COUNT(*) AS data_points
FROM fact_weather fw
JOIN dim_time dt ON fw.time_id = dt.time_id
JOIN dim_location dl ON fw.location_id = dl.location_id
JOIN dim_weather dw ON fw.weather_id = dw.weather_id
WHERE dt.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY dl.district, dl.latitude, dl.longitude, dw.temp_classification;

-- ── 5. Prediction: latest predicted temperatures ──────────────────

CREATE OR REPLACE VIEW vw_dashboard_prediction AS
WITH latest AS (
    SELECT
        dl.district,
        dt.timestamp,
        fw.temperature,
        fw.temp_avg,
        fw.temp_max,
        fw.temp_min,
        dw.temp_classification,
        ROW_NUMBER() OVER (
            PARTITION BY dl.district ORDER BY dt.timestamp DESC
        ) AS rn
    FROM fact_weather fw
    JOIN dim_time dt ON fw.time_id = dt.time_id
    JOIN dim_location dl ON fw.location_id = dl.location_id
    JOIN dim_weather dw ON fw.weather_id = dw.weather_id
)
SELECT
    district,
    timestamp AS last_observed,
    temperature AS current_temp,
    temp_avg,
    temp_max,
    temp_min,
    temp_classification
FROM latest
WHERE rn <= 3  -- last 3 observations for trend extrapolation
ORDER BY district, last_observed DESC;

-- ── 6. Anomaly Detection: temperature anomalies per location ──────

CREATE OR REPLACE VIEW vw_dashboard_anomaly AS
WITH stats AS (
    SELECT
        dl.district,
        AVG(fw.temperature) AS mean_temp,
        STDDEV(fw.temperature) AS std_temp,
        COUNT(*) AS n
    FROM fact_weather fw
    JOIN dim_time dt ON fw.time_id = dt.time_id
    JOIN dim_location dl ON fw.location_id = dl.location_id
    GROUP BY dl.district
)
SELECT
    dl.district,
    dt.timestamp,
    fw.temperature,
    ROUND(s.mean_temp, 1) AS mean_temp,
    ROUND(s.std_temp, 1) AS std_temp,
    ROUND(
        ABS(fw.temperature - s.mean_temp) / NULLIF(s.std_temp, 0), 2
    ) AS z_score,
    CASE
        WHEN ABS(fw.temperature - s.mean_temp) / NULLIF(s.std_temp, 0) > 2.5
        THEN TRUE
        ELSE FALSE
    END AS is_anomaly,
    dw.temp_classification,
    dw.condition_desc
FROM fact_weather fw
JOIN dim_time dt ON fw.time_id = dt.time_id
JOIN dim_location dl ON fw.location_id = dl.location_id
JOIN dim_weather dw ON fw.weather_id = dw.weather_id
JOIN stats s ON dl.district = s.district
WHERE s.n >= 2  -- need at least 2 data points for z-score
ORDER BY z_score DESC NULLS LAST;
