-- Dimension tables for Weather Data Warehouse (Star Schema)

-- dim_time: waktu observasi
CREATE TABLE IF NOT EXISTS dim_time (
    time_id     SERIAL PRIMARY KEY,
    timestamp   TIMESTAMP NOT NULL,
    date        DATE NOT NULL,
    hour        SMALLINT NOT NULL,
    day         SMALLINT NOT NULL,
    month       SMALLINT NOT NULL,
    year        SMALLINT NOT NULL,
    day_of_week SMALLINT NOT NULL,  -- 0=Sunday, 6=Saturday
    is_weekend  BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dim_time_timestamp ON dim_time (timestamp);
CREATE INDEX IF NOT EXISTS idx_dim_time_date ON dim_time (date);

-- dim_location: lokasi (21 kecamatan Kota Medan)
CREATE TABLE IF NOT EXISTS dim_location (
    location_id  SERIAL PRIMARY KEY,
    city         VARCHAR(100) NOT NULL,
    district     VARCHAR(100) NOT NULL,
    latitude     NUMERIC(9, 6),
    longitude    NUMERIC(9, 6),
    region_level VARCHAR(50)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dim_location_city_district
    ON dim_location (city, district);

-- dim_weather: klasifikasi kondisi cuaca
CREATE TABLE IF NOT EXISTS dim_weather (
    weather_id              SERIAL PRIMARY KEY,
    condition_code          VARCHAR(20),
    condition_desc          VARCHAR(100),
    temp_classification     VARCHAR(50),
    humidity_classification VARCHAR(50),
    wind_classification     VARCHAR(50),
    rain_classification     VARCHAR(50)
);
