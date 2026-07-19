import type { Metadata } from "next";
import { getAlerts } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import CuacaLayout from "../components/CuacaLayout";
import {
  computeBBox,
  expandBBox,
  featureToSvg,
  featureCentroid,
  project,
  type SvgFeature,
} from "@/lib/geo-to-svg";
import kecGeojsonData from "../../data/medan-kecamatan.json";
import kelGeojsonData from "../../data/medan-kelurahan.json";
import adm4MapData from "../../data/kelurahan-adm4-map.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cuaca Saat Ini",
  description:
    "Peta interaktif cuaca terkini untuk seluruh kelurahan Kota Medan — suhu, kelembaban, angin, dan curah hujan.",
};

const KECAMATAN_LIST = [
  "Medan Amplas",
  "Medan Area",
  "Medan Barat",
  "Medan Baru",
  "Medan Belawan",
  "Medan Deli",
  "Medan Denai",
  "Medan Helvetia",
  "Medan Johor",
  "Medan Kota",
  "Medan Labuhan",
  "Medan Maimun",
  "Medan Marelan",
  "Medan Perjuangan",
  "Medan Petisah",
  "Medan Polonia",
  "Medan Selayang",
  "Medan Sunggal",
  "Medan Tembung",
  "Medan Timur",
  "Medan Tuntungan",
];

// SVG dimensions (logical, viewBox scales to any screen size)
const SVG_W = 800;
const SVG_H = 1000;

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

async function getMapWeatherData() {
  const rows = await prisma.$queryRaw<MapRow[]>`
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
    WHERE dl.district ~ '^12\\.71\\.\\d{2}\\.\\d{4}$'
      AND dt.timestamp = closest.ts
  `;

  return rows.map((row) => ({
    district: row.district,
    kecamatan: KECAMATAN_MAP[row.district.substring(0, 8)] ?? "Unknown",
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
    observed_at: String(row.observed_at),
    source: row.source,
  }));
}

export default async function CuacaPage() {
  const [weather, alertData] = await Promise.all([
    getMapWeatherData(),
    getAlerts(),
  ]);
  const kecGeojson = kecGeojsonData as unknown as GeoJSON.FeatureCollection;
  const kelGeojson = kelGeojsonData as unknown as GeoJSON.FeatureCollection;
  const adm4Map = adm4MapData as Record<string, string>;

  // Build reverse map: ADM4 code → weather item, then match by kelurahan name
  const weatherByAdm4 = new Map<string, (typeof weather)[number]>();
  for (const w of weather) {
    weatherByAdm4.set(w.district, w);
  }
  const weatherByName: Record<string, (typeof weather)[number]> = {};
  for (const [name, adm4] of Object.entries(adm4Map)) {
    const w = weatherByAdm4.get(adm4);
    if (w) weatherByName[name] = w;
  }

  // Compute combined bounding box from both layers
  const bbox = expandBBox(computeBBox(kecGeojson), 0.02);

  // Pre-compute SVG paths for kecamatan
  const kecFeatures: (SvgFeature & { centroid: [number, number] })[] =
    kecGeojson.features.map((f) => {
      const svg = featureToSvg(f, bbox, SVG_W, SVG_H);
      return {
        ...svg,
        centroid: featureCentroid(f, bbox, SVG_W, SVG_H),
      };
    });

  // Pre-compute SVG paths for kelurahan
  const kelFeatures: SvgFeature[] = kelGeojson.features.map((f) =>
    featureToSvg(f, bbox, SVG_W, SVG_H)
  );

  // Pre-compute SVG paths for alert polygons
  const alertPaths = (alertData?.alerts ?? []).flatMap((alert) =>
    alert.areas.flatMap((area) =>
      area.polygons.map((polygon) => {
        const svgPoints = polygon.map(([lng, lat]) =>
          project(lng, lat, bbox, SVG_W, SVG_H)
        );
        const d =
          svgPoints
            .map((pt, i) => `${i === 0 ? "M" : "L"}${pt[0]},${pt[1]}`)
            .join(" ") + "Z";
        return {
          path: d,
          event: alert.event,
          severity: alert.severity,
          headline: alert.headline,
          expires: alert.expires,
          web: alert.web,
        };
      })
    )
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Cuaca Saat Ini
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Klik kelurahan di peta untuk melihat detail cuaca.
        </p>
      </div>

      <CuacaLayout
        kecamatanFeatures={kecFeatures}
        kelurahanFeatures={kelFeatures}
        weatherByName={weatherByName}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        alerts={alertData?.alerts ?? []}
        alertPaths={alertPaths}
      />
    </div>
  );
}
