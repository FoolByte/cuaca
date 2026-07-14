import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

interface TrendRow {
  district: string;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  observed_at: Date;
  temp_ma: number | null;
  humidity_ma: number | null;
  rainfall_ma: number | null;
  temp_delta: number | null;
  humidity_delta: number | null;
}

/**
 * GET /api/weather/trend
 *
 * Returns moving averages and deltas per location for trend analysis.
 * Query params:
 *   - district: filter by kecamatan name
 *   - limit: number of recent observations (default 24, max 96)
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
      ? await prisma.$queryRaw<TrendRow[]>`
          SELECT * FROM (
            SELECT dl.district, fw.temperature, fw.humidity, fw.rainfall,
                   dt.timestamp AS observed_at,
                   ROUND(AVG(fw.temperature) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                     ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                   )::numeric, 1) AS temp_ma,
                   ROUND(AVG(fw.humidity) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                     ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                   )::numeric, 1) AS humidity_ma,
                   ROUND(AVG(fw.rainfall) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                     ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                   )::numeric, 2) AS rainfall_ma,
                   ROUND((fw.temperature - LAG(fw.temperature) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                   ))::numeric, 1) AS temp_delta,
                   ROUND((fw.humidity - LAG(fw.humidity) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                   ))::numeric, 1) AS humidity_delta,
                   ROW_NUMBER() OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp DESC
                   ) AS rn
            FROM fact_weather fw
            JOIN dim_time dt ON fw.time_id = dt.time_id
            JOIN dim_location dl ON fw.location_id = dl.location_id
            WHERE dl.district = ${adm4}
              AND dt.timestamp >= NOW()
          ) sub
          WHERE rn <= ${limit}
          ORDER BY district, observed_at ASC
        `
      : kecamatan
        ? await prisma.$queryRaw<TrendRow[]>`
            SELECT * FROM (
              SELECT dl.district, fw.temperature, fw.humidity, fw.rainfall,
                     dt.timestamp AS observed_at,
                     ROUND(AVG(fw.temperature) OVER (
                       PARTITION BY dl.district ORDER BY dt.timestamp
                       ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                     )::numeric, 1) AS temp_ma,
                     ROUND(AVG(fw.humidity) OVER (
                       PARTITION BY dl.district ORDER BY dt.timestamp
                       ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                     )::numeric, 1) AS humidity_ma,
                     ROUND(AVG(fw.rainfall) OVER (
                       PARTITION BY dl.district ORDER BY dt.timestamp
                       ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                     )::numeric, 2) AS rainfall_ma,
                     ROUND((fw.temperature - LAG(fw.temperature) OVER (
                       PARTITION BY dl.district ORDER BY dt.timestamp
                     ))::numeric, 1) AS temp_delta,
                     ROUND((fw.humidity - LAG(fw.humidity) OVER (
                       PARTITION BY dl.district ORDER BY dt.timestamp
                     ))::numeric, 1) AS humidity_delta,
                     ROW_NUMBER() OVER (
                       PARTITION BY dl.district ORDER BY dt.timestamp ASC
                     ) AS rn
              FROM fact_weather fw
              JOIN dim_time dt ON fw.time_id = dt.time_id
              JOIN dim_location dl ON fw.location_id = dl.location_id
              WHERE dl.district LIKE ${kecamatan + ".%"}
                AND dt.timestamp >= NOW()
            ) sub
            WHERE rn <= ${limit}
            ORDER BY district, observed_at ASC
          `
        : await prisma.$queryRaw<TrendRow[]>`
          SELECT * FROM (
            SELECT dl.district, fw.temperature, fw.humidity, fw.rainfall,
                   dt.timestamp AS observed_at,
                   ROUND(AVG(fw.temperature) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                     ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                   )::numeric, 1) AS temp_ma,
                   ROUND(AVG(fw.humidity) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                     ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                   )::numeric, 1) AS humidity_ma,
                   ROUND(AVG(fw.rainfall) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                     ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                   )::numeric, 2) AS rainfall_ma,
                   ROUND((fw.temperature - LAG(fw.temperature) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                   ))::numeric, 1) AS temp_delta,
                   ROUND((fw.humidity - LAG(fw.humidity) OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp
                   ))::numeric, 1) AS humidity_delta,
                   ROW_NUMBER() OVER (
                     PARTITION BY dl.district ORDER BY dt.timestamp DESC
                   ) AS rn
            FROM fact_weather fw
            JOIN dim_time dt ON fw.time_id = dt.time_id
            JOIN dim_location dl ON fw.location_id = dl.location_id
            WHERE dt.timestamp >= NOW()
          ) sub
          WHERE rn <= ${limit}
          ORDER BY district, observed_at ASC
        `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No trend data found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const grouped = new Map<string, TrendRow[]>();
    for (const row of rows) {
      if (!grouped.has(row.district)) grouped.set(row.district, []);
      grouped.get(row.district)!.push(row);
    }

    return NextResponse.json({
      data: Array.from(grouped.entries()).map(([dist, points]) => ({
        district: dist,
        trend: points.map((p) => ({
          temperature: p.temperature,
          humidity: p.humidity,
          rainfall: p.rainfall,
          moving_averages: {
            temperature: p.temp_ma,
            humidity: p.humidity_ma,
            rainfall: p.rainfall_ma,
          },
          deltas: {
            temperature: p.temp_delta,
            humidity: p.humidity_delta,
          },
          observed_at: p.observed_at,
        })),
      })),
      meta: {
        total_points: rows.length,
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
