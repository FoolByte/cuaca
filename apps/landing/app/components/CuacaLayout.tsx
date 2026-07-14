"use client";

import { useState, useCallback } from "react";
import MedanSvgMap from "./MedanSvgMap";
import AlertBanner from "./AlertBanner";
import Icon from "./Icon";
import type { MapWeatherData, AlertData } from "@/lib/api";
import type { SvgFeature } from "@/lib/geo-to-svg";

type WeatherItem = MapWeatherData["data"][number];

interface AlertPath {
  path: string;
  event: string;
  severity: string;
  headline: string;
  expires: string;
  web: string;
}

interface Props {
  kecamatanFeatures: (SvgFeature & { centroid: [number, number] })[];
  kelurahanFeatures: SvgFeature[];
  weatherByName: Record<string, WeatherItem>;
  viewBox: string;
  alerts?: AlertData["alerts"];
  alertPaths?: AlertPath[];
}

// Continuous HSL gradient: blue (18°C) → cyan → green → yellow → red (38°C)
function getHeatColor(temp: number | null): string {
  if (temp == null) return "#e2e8f0";
  const clamped = Math.max(18, Math.min(38, temp));
  const hue = 240 - ((clamped - 18) / 20) * 240;
  return `hsl(${hue}, 70%, 55%)`;
}

export default function CuacaLayout({
  kecamatanFeatures,
  kelurahanFeatures,
  weatherByName,
  viewBox,
  alerts = [],
  alertPaths = [],
}: Props) {
  const [selected, setSelected] = useState<WeatherItem | null>(null);
  const [selectedKelName, setSelectedKelName] = useState("");

  const handleSelect = useCallback(
    (name: string, kecamatan: string) => {
      setSelectedKelName(name);
      const w = weatherByName[name];
      if (w) {
        setSelected(w);
      } else {
        setSelected({
          district: name,
          kecamatan,
          location: { latitude: null, longitude: null },
          weather: {
            temperature: null,
            humidity: null,
            pressure: null,
            wind_direction: null,
            wind_speed: null,
            rainfall: null,
            visibility: null,
            cloud_coverage: null,
          },
          classification: {
            temperature: null,
            humidity: null,
            wind: null,
            rainfall: null,
            condition: null,
          },
          observed_at: "",
          source: null,
        });
      }
    },
    [weatherByName]
  );

  const handleClose = useCallback(() => {
    setSelected(null);
    setSelectedKelName("");
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Map panel */}
      <div className={`${selected ? "lg:w-3/5" : "w-full"} transition-all duration-300`}>
        {alerts.length > 0 && <AlertBanner alerts={alerts} />}
        <MedanSvgMap
          kecamatanFeatures={kecamatanFeatures}
          kelurahanFeatures={kelurahanFeatures}
          weatherByName={weatherByName}
          viewBox={viewBox}
          selected={selected}
          selectedKelName={selectedKelName}
          onSelect={handleSelect}
          onClose={handleClose}
          alertPaths={alertPaths}
        />
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="lg:w-2/5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {selectedKelName}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Kec. {selected.kecamatan}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none p-1"
            >
              ✕
            </button>
          </div>

          {/* Condition */}
          {selected.classification.condition && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {selected.classification.condition}
              </p>
            </div>
          )}

          {/* Temperature big display */}
          <div className="flex items-baseline gap-2 mb-6">
            <span
              className="text-5xl font-bold"
              style={{ color: getHeatColor(selected.weather.temperature) }}
            >
              {selected.weather.temperature != null
                ? Math.round(selected.weather.temperature)
                : "—"}
            </span>
            <span className="text-2xl text-zinc-400">°C</span>
            {selected.classification.temperature && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ml-2">
                {selected.classification.temperature}
              </span>
            )}
          </div>

          {/* Weather metrics grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <MetricCard
              icon={<Icon name="droplet" size={14} className="text-blue-500" />}
              label="Kelembaban"
              value={selected.weather.humidity != null ? `${selected.weather.humidity}%` : "—"}
              sub={selected.classification.humidity}
            />
            <MetricCard
              icon={<Icon name="cloud-rain" size={14} className="text-cyan-500" />}
              label="Hujan"
              value={selected.weather.rainfall != null ? `${selected.weather.rainfall} mm` : "—"}
              sub={selected.classification.rainfall}
            />
            <MetricCard
              icon={<Icon name="wind" size={14} className="text-emerald-500" />}
              label="Angin"
              value={selected.weather.wind_speed != null ? `${selected.weather.wind_speed} km/h` : "—"}
              sub={
                selected.weather.wind_direction
                  ? `Arah ${selected.weather.wind_direction}`
                  : selected.classification.wind
              }
            />
            <MetricCard
              icon={<Icon name="eye" size={14} className="text-violet-500" />}
              label="Visibilitas"
              value={selected.weather.visibility != null ? `${selected.weather.visibility} km` : "—"}
            />
            <MetricCard
              icon={<Icon name="cloud" size={14} className="text-zinc-500" />}
              label="Awan"
              value={selected.weather.cloud_coverage != null ? `${selected.weather.cloud_coverage}%` : "—"}
            />
            <MetricCard
              icon={<Icon name="gauge" size={14} className="text-amber-500" />}
              label="Tekanan"
              value={selected.weather.pressure != null ? `${selected.weather.pressure} hPa` : "—"}
            />
          </div>

          {/* Coordinates */}
          {selected.location.latitude && selected.location.longitude && (
            <div className="text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-700 pt-3">
              <Icon name="map-pin" size={12} /> {selected.location.latitude}, {selected.location.longitude}
            </div>
          )}

          {/* Observed at */}
          {selected.observed_at && (
            <p className="text-xs text-zinc-400 mt-2">
              <Icon name="clock" size={12} /> {new Date(selected.observed_at).toLocaleString("id-ID")}
            </p>
          )}

          {/* Source */}
          {selected.source && (
            <p className="text-xs text-zinc-400 mt-1">
              <Icon name="satellite" size={12} /> Sumber: {selected.source}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string | null;
}) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      </div>
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{value}</p>
      {sub && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</p>
      )}
    </div>
  );
}
