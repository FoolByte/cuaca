-- Fact table for Weather Data Warehouse (Star Schema)

CREATE TABLE IF NOT EXISTS fact_weather (
    fact_weather_id  SERIAL PRIMARY KEY,
    time_id          INTEGER NOT NULL REFERENCES dim_time(time_id),
    location_id      INTEGER NOT NULL REFERENCES dim_location(location_id),
    weather_id       INTEGER NOT NULL REFERENCES dim_weather(weather_id),
    temperature      NUMERIC(5, 2),   -- °C
    humidity         NUMERIC(5, 2),   -- %
    pressure         NUMERIC(7, 2),   -- hPa
    wind_direction   VARCHAR(20),
    wind_speed       NUMERIC(5, 2),   -- km/h
    rainfall         NUMERIC(6, 2),   -- mm
    uv_index         NUMERIC(4, 2),
    visibility       NUMERIC(5, 2),   -- km
    cloud_coverage   NUMERIC(5, 2),   -- %
    temp_avg         NUMERIC(5, 2),   -- °C, agregat per periode
    temp_max         NUMERIC(5, 2),   -- °C
    temp_min         NUMERIC(5, 2),   -- °C
    source           VARCHAR(50),     -- BMKG / OpenWeather / Mock
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Mencegah duplikasi saat incremental load
    CONSTRAINT uq_fact_time_location UNIQUE (time_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_fact_weather_time ON fact_weather (time_id);
CREATE INDEX IF NOT EXISTS idx_fact_weather_location ON fact_weather (location_id);
CREATE INDEX IF NOT EXISTS idx_fact_weather_created ON fact_weather (created_at);
