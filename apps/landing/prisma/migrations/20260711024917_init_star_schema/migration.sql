-- CreateTable
CREATE TABLE "dim_time" (
    "time_id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL,
    "date" DATE NOT NULL,
    "hour" SMALLINT NOT NULL,
    "day" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "year" SMALLINT NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "is_weekend" BOOLEAN NOT NULL,

    CONSTRAINT "dim_time_pkey" PRIMARY KEY ("time_id")
);

-- CreateTable
CREATE TABLE "dim_location" (
    "location_id" SERIAL NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "region_level" VARCHAR(50),

    CONSTRAINT "dim_location_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "dim_weather" (
    "weather_id" SERIAL NOT NULL,
    "condition_code" VARCHAR(20),
    "condition_desc" VARCHAR(100),
    "temp_classification" VARCHAR(50),
    "humidity_classification" VARCHAR(50),
    "wind_classification" VARCHAR(50),
    "rain_classification" VARCHAR(50),

    CONSTRAINT "dim_weather_pkey" PRIMARY KEY ("weather_id")
);

-- CreateTable
CREATE TABLE "fact_weather" (
    "fact_weather_id" SERIAL NOT NULL,
    "time_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "weather_id" INTEGER NOT NULL,
    "temperature" DECIMAL(5,2),
    "humidity" DECIMAL(5,2),
    "pressure" DECIMAL(7,2),
    "wind_direction" VARCHAR(20),
    "wind_speed" DECIMAL(5,2),
    "rainfall" DECIMAL(6,2),
    "uv_index" DECIMAL(4,2),
    "visibility" DECIMAL(5,2),
    "cloud_coverage" DECIMAL(5,2),
    "temp_avg" DECIMAL(5,2),
    "temp_max" DECIMAL(5,2),
    "temp_min" DECIMAL(5,2),
    "source" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_weather_pkey" PRIMARY KEY ("fact_weather_id")
);

-- CreateTable
CREATE TABLE "raw_weather_observations" (
    "raw_id" SERIAL NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "raw_json" JSONB NOT NULL,
    "observed_at" TIMESTAMP(6) NOT NULL,
    "ingested_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "raw_weather_observations_pkey" PRIMARY KEY ("raw_id")
);

-- CreateIndex
CREATE INDEX "dim_time_timestamp_idx" ON "dim_time"("timestamp");

-- CreateIndex
CREATE INDEX "dim_time_date_idx" ON "dim_time"("date");

-- CreateIndex
CREATE UNIQUE INDEX "dim_location_city_district_key" ON "dim_location"("city", "district");

-- CreateIndex
CREATE INDEX "fact_weather_time_id_idx" ON "fact_weather"("time_id");

-- CreateIndex
CREATE INDEX "fact_weather_location_id_idx" ON "fact_weather"("location_id");

-- CreateIndex
CREATE INDEX "fact_weather_created_at_idx" ON "fact_weather"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fact_weather_time_id_location_id_key" ON "fact_weather"("time_id", "location_id");

-- CreateIndex
CREATE INDEX "raw_weather_observations_source_idx" ON "raw_weather_observations"("source");

-- CreateIndex
CREATE INDEX "raw_weather_observations_observed_at_idx" ON "raw_weather_observations"("observed_at");

-- CreateIndex
CREATE INDEX "raw_weather_observations_processed_idx" ON "raw_weather_observations"("processed");

-- AddForeignKey
ALTER TABLE "fact_weather" ADD CONSTRAINT "fact_weather_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "dim_time"("time_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_weather" ADD CONSTRAINT "fact_weather_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "dim_location"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_weather" ADD CONSTRAINT "fact_weather_weather_id_fkey" FOREIGN KEY ("weather_id") REFERENCES "dim_weather"("weather_id") ON DELETE RESTRICT ON UPDATE CASCADE;
