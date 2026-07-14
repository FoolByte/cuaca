"use client";

import { useState } from "react";
import Link from "next/link";
import WeatherIcon from "./WeatherIcon";
import type { CurrentWeatherData } from "@/lib/api";

type WeatherItem = CurrentWeatherData["data"][number];

const CONDITION_CODES: Record<string, number> = {
  Cerah: 0,
  "Cerah Berawan": 2,
  Berawan: 3,
  "Berawan Tebal": 4,
  "Udara Kabur": 10,
  Kabut: 45,
  "Hujan Ringan": 61,
  "Hujan Sedang": 63,
  "Hujan Lebat": 65,
  "Hujan Lokal": 80,
  "Hujan Petir": 95,
};

function getConditionCode(desc: string | null): number {
  if (!desc) return 3;
  return CONDITION_CODES[desc] ?? 3;
}

function getTempColor(temp: number | null): string {
  if (temp == null) return "#94a3b8";
  if (temp >= 35) return "#ef4444";
  if (temp >= 32) return "#f97316";
  if (temp >= 28) return "#eab308";
  if (temp >= 24) return "#22c55e";
  return "#3b82f6";
}

function getKecamatan(district: string): string {
  const prefix = district.substring(0, 8);
  const map: Record<string, string> = {
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
  return map[prefix] ?? prefix;
}

export default function HomeClient({ weather }: { weather: WeatherItem[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Group by kecamatan, pick hottest per kecamatan
  const kecMap = new Map<string, WeatherItem>();
  for (const w of weather) {
    const kec = getKecamatan(w.district);
    const existing = kecMap.get(kec);
    if (
      !existing ||
      (w.weather.temperature ?? -999) >
        (existing.weather.temperature ?? -999)
    ) {
      kecMap.set(kec, w);
    }
  }
  const kecList = [...kecMap.entries()]
    .sort((a, b) => (b[1].weather.temperature ?? 0) - (a[1].weather.temperature ?? 0));

  // Featured: hottest kelurahan
  const featured =
    weather.length > 0
      ? weather.reduce((max, w) =>
          (w.weather.temperature ?? -999) > (max.weather.temperature ?? -999)
            ? w
            : max
        )
      : null;

  return (
    <div className="space-y-8">
      {/* Featured card */}
      {featured && (
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 rounded-2xl border border-sky-200/50 dark:border-sky-800/30 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <WeatherIcon
                condition={getConditionCode(featured.classification.condition)}
                isDay={true}
                size={80}
              />
            </div>
            <div className="text-center sm:text-left flex-1">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Suhu tertinggi saat ini
              </p>
              <div className="flex items-baseline justify-center sm:justify-start gap-1 mt-1">
                <span
                  className="text-6xl font-bold tracking-tight"
                  style={{
                    color: getTempColor(featured.weather.temperature),
                  }}
                >
                  {featured.weather.temperature != null
                    ? Math.round(featured.weather.temperature)
                    : "—"}
                </span>
                <span className="text-2xl text-zinc-400">°C</span>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-1">
                {featured.classification.condition ?? "—"}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Kec. {getKecamatan(featured.district)} · {featured.district}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {featured.weather.humidity ?? "—"}%
                </p>
                <p className="text-xs text-zinc-500">Kelembaban</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {featured.weather.wind_speed ?? "—"}
                </p>
                <p className="text-xs text-zinc-500">km/h</p>
              </div>
              <div>
                <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                  {featured.weather.rainfall ?? "—"} mm
                </p>
                <p className="text-xs text-zinc-500">Hujan</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kecamatan grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Cuaca per Kecamatan
          </h2>
          <Link
            href="/cuaca"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Peta lengkap →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {kecList.map(([kec, w], i) => (
            <Link
              key={kec}
              href="/cuaca"
              className="group relative bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-lg hover:border-sky-300 dark:hover:border-sky-700 transition-all"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                  {kec.replace("Medan ", "")}
                </h3>
                <WeatherIcon
                  condition={getConditionCode(w.classification.condition)}
                  isDay={true}
                  size={28}
                />
              </div>
              <div className="flex items-baseline gap-0.5">
                <span
                  className="text-2xl font-bold"
                  style={{ color: getTempColor(w.weather.temperature) }}
                >
                  {w.weather.temperature != null
                    ? Math.round(w.weather.temperature)
                    : "—"}
                </span>
                <span className="text-sm text-zinc-400">°</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                {w.classification.condition ?? "—"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
