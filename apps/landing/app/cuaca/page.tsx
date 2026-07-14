import type { Metadata } from "next";
import { getMapWeather, getAlerts } from "@/lib/api";
import CuacaLayout from "../components/CuacaLayout";
import { readFileSync } from "fs";
import { join } from "path";
import {
  computeBBox,
  expandBBox,
  featureToSvg,
  featureCentroid,
  project,
  type SvgFeature,
} from "@/lib/geo-to-svg";

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

export default async function CuacaPage() {
  const [data, kecGeojson, kelGeojson, adm4Map, alertData] = await Promise.all([
    getMapWeather(),
    Promise.resolve(
      JSON.parse(
        readFileSync(
          join(process.cwd(), "public/data/medan-kecamatan.geojson"),
          "utf-8"
        )
      ) as GeoJSON.FeatureCollection
    ),
    Promise.resolve(
      JSON.parse(
        readFileSync(
          join(process.cwd(), "public/data/medan-kelurahan.geojson"),
          "utf-8"
        )
      ) as GeoJSON.FeatureCollection
    ),
    Promise.resolve(
      JSON.parse(
        readFileSync(
          join(process.cwd(), "public/data/kelurahan-adm4-map.json"),
          "utf-8"
        )
      ) as Record<string, string>
    ),
    getAlerts(),
  ]);

  const weather = data?.data ?? [];

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
        {data?.meta?.timestamp && (
          <p className="text-xs text-zinc-400 mt-1">
            Terakhir diperbarui:{" "}
            {new Date(data.meta.timestamp).toLocaleString("id-ID")}
          </p>
        )}
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
