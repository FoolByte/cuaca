import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

/**
 * GET /api/weather/locations
 *
 * Returns kecamatan → kelurahan hierarchy from dim_location + raw data.
 * Each kelurahan has its ADM4 code for API filtering.
 */

// ADM4 prefix → kecamatan name
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

interface LocationRow {
  district: string;
}

export async function GET() {
  try {
    // Get ADM4 codes from dim_location
    const rows = await prisma.$queryRaw<LocationRow[]>`
      SELECT DISTINCT district FROM dim_location
      WHERE district ~ '^12\\.71\\.\\d{2}\\.\\d{4}$'
      ORDER BY district
    `;

    // Get kelurahan names directly from raw JSON — one row per distinct ADM4
    const nameRows = await prisma.$queryRaw<{ adm4: string; desa: string }[]>`
      SELECT DISTINCT
        raw_json->'lokasi'->>'adm4' AS adm4,
        raw_json->'lokasi'->>'desa' AS desa
      FROM raw_weather_observations
      WHERE source = 'BMKG'
        AND raw_json->'lokasi'->>'adm4' IS NOT NULL
        AND raw_json->'lokasi'->>'desa' IS NOT NULL
    `;

    const kelNameMap: Record<string, string> = {};
    for (const row of nameRows) {
      kelNameMap[row.adm4] = row.desa;
    }

    // Group by kecamatan
    const kecamatanMap = new Map<
      string,
      Array<{ adm4: string; name: string }>
    >();

    for (const row of rows) {
      const prefix = row.district.substring(0, 8);
      const kecamatanName = KECAMATAN_MAP[prefix] ?? prefix;
      if (!kecamatanMap.has(kecamatanName)) {
        kecamatanMap.set(kecamatanName, []);
      }
      kecamatanMap.get(kecamatanName)!.push({
        adm4: row.district,
        name: kelNameMap[row.district] ?? row.district,
      });
    }

    const data = Array.from(kecamatanMap.entries())
      .map(([name, kelurahan]) => ({
        kecamatan: name,
        kelurahan,
      }))
      .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));

    return NextResponse.json({
      data,
      meta: {
        total_kecamatan: data.length,
        total_kelurahan: rows.length,
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
