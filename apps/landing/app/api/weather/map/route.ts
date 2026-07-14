import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

/**
 * GET /api/weather/map
 *
 * Returns latest weather per kelurahan with kecamatan name and coordinates.
 * Designed for the interactive map component.
 */

// ADM4 prefix → kecamatan name (verified from BMKG API)
const KECAMATAN_MAP: Record<string, string> = {
  "12.71.01": "Medan Kota",
  "12.71.02": "Medan Sunggal",
  "12.71.03": "Medan Helvetia",
  "12.71.04": "Medan Denai",
  "12.71.05": "Medan Barat",
  "12.71.06": "Medan Deli",
  "12.71.07": "Medan Tuntungan",
  "12.71.08": "Medan Belawan",
  "12.71.09": "Medan Amplas",
  "12.71.10": "Medan Area",
  "12.71.11": "Medan Johor",
  "12.71.12": "Medan Marelan",
  "12.71.13": "Medan Labuhan",
  "12.71.14": "Medan Tembung",
  "12.71.15": "Medan Maimun",
  "12.71.16": "Medan Polonia",
  "12.71.17": "Medan Baru",
  "12.71.18": "Medan Perjuangan",
  "12.71.19": "Medan Petisah",
  "12.71.20": "Medan Timur",
  "12.71.21": "Medan Selayang",
};

function getKecamatan(district: string): string {
  const prefix = district.substring(0, 8); // "12.71.XX"
  return KECAMATAN_MAP[prefix] ?? "Unknown";
}

interface MapRow {
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

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<MapRow[]>`
      WITH latest AS (
        SELECT MAX(dt.timestamp) AS ts
        FROM fact_weather fw
        JOIN dim_time dt ON fw.time_id = dt.time_id
        WHERE dt.timestamp <= NOW()
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
      CROSS JOIN latest
      WHERE dl.district ~ '^12\\.71\\.\\d{2}\\.\\d{4}$'
        AND dt.timestamp = latest.ts
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No weather data found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: rows.map((row) => ({
        district: row.district,
        kecamatan: getKecamatan(row.district),
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
      })),
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
