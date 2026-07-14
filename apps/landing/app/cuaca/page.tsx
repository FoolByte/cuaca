import type { Metadata } from "next";
import { getMapWeather } from "@/lib/api";
import CuacaLayout from "../components/CuacaLayout";
import { readFileSync } from "fs";
import { join } from "path";
import {
  computeBBox,
  expandBBox,
  featureToSvg,
  featureCentroid,
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
  const [data, kecGeojson, kelGeojson, adm4Map] = await Promise.all([
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
      />

      {/* Legend — temperature gradient + border info */}
      <div className="mt-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          Suhu (°C)
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-zinc-500">18°C</span>
          <div
            className="h-3 flex-1 rounded-full"
            style={{
              background:
                "linear-gradient(to right, hsl(240,70%,55%), hsl(180,70%,55%), hsl(120,70%,55%), hsl(60,70%,55%), hsl(0,70%,55%))",
            }}
          />
          <span className="text-xs text-zinc-500">38°C</span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-zinc-800 dark:bg-zinc-200 inline-block" />
            Kecamatan (garis tebal)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0 border-t border-dashed border-zinc-500 inline-block" />
            Kelurahan (garis putus-putus)
          </span>
        </div>
      </div>
    </div>
  );
}
