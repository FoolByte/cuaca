import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

interface ForecastRow {
  district: string;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  wind_speed: number | null;
  cloud_coverage: number | null;
  condition_desc: string | null;
  temp_classification: string | null;
  observed_at: Date;
  temp_avg: number | null;
  temp_max: number | null;
  temp_min: number | null;
}

/**
 * GET /api/weather/forecast
 *
 * Returns the last N observations per location for trend visualization.
 * Query params:
 *   - district: filter by kecamatan name
 *   - limit: number of observations per location (default 12, max 48)
 */
export async function GET(request: NextRequest) {
  try {
    const adm4 = request.nextUrl.searchParams.get("adm4");
    const kecamatan = request.nextUrl.searchParams.get("kecamatan");
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(
      Math.max(parseInt(limitParam ?? "24", 10) || 24, 1),
      96
    );

    const rows = adm4
      ? await prisma.$queryRaw<ForecastRow[]>`
          SELECT district, temperature, humidity, rainfall, wind_speed,
                 cloud_coverage, condition_desc, temp_classification,
                 observed_at, temp_avg, temp_max, temp_min
          FROM fact_weather fw
          JOIN dim_time dt ON fw.time_id = dt.time_id
          JOIN dim_location dl ON fw.location_id = dl.location_id
          JOIN dim_weather dw ON fw.weather_id = dw.weather_id
          WHERE dl.district = ${adm4}
            AND dt.timestamp >= NOW()
          ORDER BY observed_at ASC
        `
      : kecamatan
        ? await prisma.$queryRaw<ForecastRow[]>`
            SELECT district, temperature, humidity, rainfall, wind_speed,
                   cloud_coverage, condition_desc, temp_classification,
                   observed_at, temp_avg, temp_max, temp_min
            FROM fact_weather fw
            JOIN dim_time dt ON fw.time_id = dt.time_id
            JOIN dim_location dl ON fw.location_id = dl.location_id
            JOIN dim_weather dw ON fw.weather_id = dw.weather_id
            WHERE dl.district LIKE ${kecamatan + ".%"}
              AND dt.timestamp >= NOW()
            ORDER BY observed_at ASC
          `
        : await prisma.$queryRaw<ForecastRow[]>`
            SELECT district, temperature, humidity, rainfall, wind_speed,
                   cloud_coverage, condition_desc, temp_classification,
                   observed_at, temp_avg, temp_max, temp_min
            FROM fact_weather fw
            JOIN dim_time dt ON fw.time_id = dt.time_id
            JOIN dim_location dl ON fw.location_id = dl.location_id
            JOIN dim_weather dw ON fw.weather_id = dw.weather_id
            WHERE dt.timestamp >= NOW()
            ORDER BY district, observed_at ASC
          `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No forecast data found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const grouped = new Map<string, ForecastRow[]>();
    for (const row of rows) {
      if (!grouped.has(row.district)) grouped.set(row.district, []);
      grouped.get(row.district)!.push(row);
    }

    return NextResponse.json({
      data: Array.from(grouped.entries()).map(([dist, obs]) => ({
        district: dist,
        observations: obs.map((o) => ({
          temperature: o.temperature,
          humidity: o.humidity,
          rainfall: o.rainfall,
          wind_speed: o.wind_speed,
          cloud_coverage: o.cloud_coverage,
          condition: o.condition_desc,
          temp_classification: o.temp_classification,
          aggregates: {
            temp_avg: o.temp_avg,
            temp_max: o.temp_max,
            temp_min: o.temp_min,
          },
          observed_at: o.observed_at,
        })),
      })),
      meta: {
        total_observations: rows.length,
        limit,
        timestamp: new Date().toISOString(),
      },
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
