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

    // Round to next 3-hour BMKG slot
    const now = new Date();
    const h = now.getUTCHours();
    const nextSlot = new Date(now);
    nextSlot.setUTCMinutes(0, 0, 0);
    if (h % 3 === 0 && now.getUTCMinutes() === 0) {
      // exactly on a slot — use it
    } else {
      nextSlot.setUTCHours(Math.ceil(h / 3) * 3, 0, 0, 0);
    }

    const rows = district
      ? await prisma.$queryRaw<CurrentRow[]>`
          WITH target AS (
            SELECT MIN(dt.timestamp) AS ts
            FROM dim_time dt
            WHERE dt.timestamp >= ${nextSlot.toISOString()}::timestamp
          )
          SELECT dl.district, dl.latitude, dl.longitude,
            fw.temperature, fw.humidity, fw.pressure,
            fw.wind_direction, fw.wind_speed, fw.rainfall,
            fw.visibility, fw.cloud_coverage,
            dw.temp_classification, dw.humidity_classification,
            dw.wind_classification, dw.rain_classification,
            dw.condition_desc,
            dt.timestamp AS observed_at, fw.source
          FROM fact_weather fw
          JOIN dim_time dt ON fw.time_id = dt.time_id
          JOIN dim_location dl ON fw.location_id = dl.location_id
          JOIN dim_weather dw ON fw.weather_id = dw.weather_id
          CROSS JOIN target
          WHERE dl.district = ${district}
            AND dt.timestamp = target.ts
        `
      : await prisma.$queryRaw<CurrentRow[]>`
          WITH target AS (
            SELECT MIN(dt.timestamp) AS ts
            FROM dim_time dt
            WHERE dt.timestamp >= ${nextSlot.toISOString()}::timestamp
          )
          SELECT dl.district, dl.latitude, dl.longitude,
            fw.temperature, fw.humidity, fw.pressure,
            fw.wind_direction, fw.wind_speed, fw.rainfall,
            fw.visibility, fw.cloud_coverage,
            dw.temp_classification, dw.humidity_classification,
            dw.wind_classification, dw.rain_classification,
            dw.condition_desc,
            dt.timestamp AS observed_at, fw.source
          FROM fact_weather fw
          JOIN dim_time dt ON fw.time_id = dt.time_id
          JOIN dim_location dl ON fw.location_id = dl.location_id
          JOIN dim_weather dw ON fw.weather_id = dw.weather_id
          CROSS JOIN target
          WHERE dt.timestamp = target.ts
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
