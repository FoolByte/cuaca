-- Staging table: landing zone for raw weather data from Extract phase
-- Lives outside the star schema, used by ETL (Python) directly

CREATE TABLE IF NOT EXISTS raw_weather_observations (
    raw_id      SERIAL PRIMARY KEY,
    source      VARCHAR(50) NOT NULL,   -- BMKG / OpenWeather / Mock
    raw_json    JSONB NOT NULL,
    observed_at TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_raw_obs_source ON raw_weather_observations (source);
CREATE INDEX IF NOT EXISTS idx_raw_obs_observed ON raw_weather_observations (observed_at);
CREATE INDEX IF NOT EXISTS idx_raw_obs_processed ON raw_weather_observations (processed);
