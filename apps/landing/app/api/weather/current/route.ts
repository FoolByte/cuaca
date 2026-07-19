import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

/**
 * GET /api/weather/current
 *
 * Returns the latest weather observation for each kecamatan in Medan.
 * Optional query param: `district` to filter by one kecamatan.
 */
export async function GET(request: NextRequest) {
  try {
    const district = request.nextUrl.searchParams.get("district");

    // Find closest timestamp with most kelurahan data
    const rows = district
      ? await prisma.$queryRaw<CurrentRow[]>`
          WITH ranked AS (
            SELECT dt.timestamp AS ts,
                   COUNT(DISTINCT dl.district) AS cnt,
                   ROW_NUMBER() OVER (
                     ORDER BY ABS(EXTRACT(EPOCH FROM (dt.timestamp - NOW()))) ASC
                   ) AS rn
            FROM dim_time dt
            JOIN fact_weather fw ON fw.time_id = dt.time_id
            JOIN dim_location dl ON fw.location_id = dl.location_id
            WHERE dl.district ~ '^12\\.71\\.\\d{2}\\.\\d{4}$'
            GROUP BY dt.timestamp
          ),
          closest AS (
            SELECT ts FROM ranked
            WHERE cnt >= 10
            ORDER BY rn
            LIMIT 1
          )
          SELECT dl.district, dl.latitude, dl.longitude,
            fw.temperature, fw.humidity, fw.pressure,
            fw.wind_direction, fw.wind_speed, fw.rainfall,
            fw.visibility, fw.cloud_coverage,
            dw.temp_classification, dw.humidity_classification,
            dw.wind_classification, dw.rain_classification,
            dw.condition_desc,
            dt.timestamp::text AS observed_at, fw.source
          FROM fact_weather fw
          JOIN dim_time dt ON fw.time_id = dt.time_id
          JOIN dim_location dl ON fw.location_id = dl.location_id
          JOIN dim_weather dw ON fw.weather_id = dw.weather_id
          CROSS JOIN closest
          WHERE dl.district = ${district}
            AND dt.timestamp = closest.ts
        `
      : await prisma.$queryRaw<CurrentRow[]>`
          WITH ranked AS (
            SELECT dt.timestamp AS ts,
                   COUNT(DISTINCT dl.district) AS cnt,
                   ROW_NUMBER() OVER (
                     ORDER BY ABS(EXTRACT(EPOCH FROM (dt.timestamp - NOW()))) ASC
                   ) AS rn
            FROM dim_time dt
            JOIN fact_weather fw ON fw.time_id = dt.time_id
            JOIN dim_location dl ON fw.location_id = dl.location_id
            WHERE dl.district ~ '^12\\.71\\.\\d{2}\\.\\d{4}$'
            GROUP BY dt.timestamp
          ),
          closest AS (
            SELECT ts FROM ranked
            WHERE cnt >= 10
            ORDER BY rn
            LIMIT 1
          )
          SELECT dl.district, dl.latitude, dl.longitude,
            fw.temperature, fw.humidity, fw.pressure,
            fw.wind_direction, fw.wind_speed, fw.rainfall,
            fw.visibility, fw.cloud_coverage,
            dw.temp_classification, dw.humidity_classification,
            dw.wind_classification, dw.rain_classification,
            dw.condition_desc,
            dt.timestamp::text AS observed_at, fw.source
          FROM fact_weather fw
          JOIN dim_time dt ON fw.time_id = dt.time_id
          JOIN dim_location dl ON fw.location_id = dl.location_id
          JOIN dim_weather dw ON fw.weather_id = dw.weather_id
          CROSS JOIN closest
          WHERE dt.timestamp = closest.ts
        `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No weather data found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: rows.map(formatCurrentWeather),
      meta: { count: rows.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

interface CurrentRow {
  district: string;
  latitude: number | null;
  longitude: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  wind_direction: string | null;
  wind_speed: number | null;
  rainfall: number | null;
  visibility: number | null;
  cloud_coverage: number | null;
  temp_classification: string | null;
  humidity_classification: string | null;
  wind_classification: string | null;
  rain_classification: string | null;
  condition_desc: string | null;
  observed_at: Date;
  source: string | null;
}

function formatCurrentWeather(row: CurrentRow) {
  return {
    district: row.district,
    location: { latitude: row.latitude, longitude: row.longitude },
    weather: {
      temperature: row.temperature,
      humidity: row.humidity,
      pressure: row.pressure,
      wind_direction: row.wind_direction,
      wind_speed: row.wind_speed,
      rainfall: row.rainfall,
      visibility: row.visibility,
      cloud_coverage: row.cloud_coverage,
    },
    classification: {
      temperature: row.temp_classification,
      humidity: row.humidity_classification,
      wind: row.wind_classification,
      rainfall: row.rain_classification,
      condition: row.condition_desc,
    },
    observed_at: row.observed_at,
    source: row.source,
  };
}
