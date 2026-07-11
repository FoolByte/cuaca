import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

interface HeatmapRow {
  district: string;
  latitude: number | null;
  longitude: number | null;
  avg_temperature: number | null;
  avg_rainfall: number | null;
  avg_humidity: number | null;
  avg_cloud_coverage: number | null;
  data_points: bigint;
}

/**
 * GET /api/weather/heatmap
 *
 * Returns temperature and rainfall averages per location with coordinates
 * for map visualization (Leaflet/MapLibre).
 * Query params:
 *   - hours: lookback window in hours (default 24, max 168)
 */
export async function GET(request: NextRequest) {
  try {
    const hoursParam = request.nextUrl.searchParams.get("hours");
    const hours = Math.min(
      Math.max(parseInt(hoursParam ?? "24", 10) || 24, 1),
      168
    );

    const intervalHours = `${hours} hours`;

    const rows = await prisma.$queryRaw<HeatmapRow[]>`
      SELECT
        dl.district,
        dl.latitude,
        dl.longitude,
        ROUND(AVG(fw.temperature)::numeric, 1) AS avg_temperature,
        ROUND(AVG(fw.rainfall)::numeric, 2) AS avg_rainfall,
        ROUND(AVG(fw.humidity)::numeric, 1) AS avg_humidity,
        ROUND(AVG(fw.cloud_coverage)::numeric, 1) AS avg_cloud_coverage,
        COUNT(*) AS data_points
      FROM fact_weather fw
      JOIN dim_time dt ON fw.time_id = dt.time_id
      JOIN dim_location dl ON fw.location_id = dl.location_id
      WHERE dt.timestamp >= NOW() - ${intervalHours}::INTERVAL
      GROUP BY dl.district, dl.latitude, dl.longitude
      ORDER BY dl.district
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No heatmap data found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: rows.map((row) => ({
        district: row.district,
        coordinates: {
          latitude: row.latitude,
          longitude: row.longitude,
        },
        metrics: {
          avg_temperature: row.avg_temperature,
          avg_rainfall: row.avg_rainfall,
          avg_humidity: row.avg_humidity,
          avg_cloud_coverage: row.avg_cloud_coverage,
        },
        data_points: Number(row.data_points),
      })),
      meta: {
        lookback_hours: hours,
        locations: rows.length,
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
