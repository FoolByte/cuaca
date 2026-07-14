"use client";

import { useState } from "react";
import type { MapWeatherData } from "@/lib/api";
import type { SvgFeature } from "@/lib/geo-to-svg";

type WeatherItem = MapWeatherData["data"][number];

interface Props {
  kecamatanFeatures: (SvgFeature & {
    centroid: [number, number];
  })[];
  kelurahanFeatures: SvgFeature[];
  weatherByName: Record<string, WeatherItem>;
  viewBox: string;
  selected: WeatherItem | null;
  selectedKelName: string;
  onSelect: (name: string, kecamatan: string) => void;
  onClose: () => void;
}

// Continuous HSL gradient: blue (18°C) → cyan → green → yellow → red (38°C)
function getHeatColor(temp: number | null): string {
  if (temp == null) return "#e2e8f0"; // slate-200 for no data
  const clamped = Math.max(18, Math.min(38, temp));
  const hue = 240 - ((clamped - 18) / 20) * 240; // 240°→0°
  return `hsl(${hue}, 70%, 55%)`;
}

export default function MedanSvgMap({
  kecamatanFeatures,
  kelurahanFeatures,
  weatherByName,
  viewBox,
  selected,
  selectedKelName,
  onSelect,
  onClose,
}: Props) {
  const [hoveredKec, setHoveredKec] = useState<string | null>(null);
  const [hoveredKel, setHoveredKel] = useState<string | null>(null);

  return (
    <div className="relative">
      <div className="rounded-xl overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
        <svg
          viewBox={viewBox}
          className="w-full h-auto"
          style={{ maxHeight: "80vh" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Kelurahan polygons — choropleth heatmap only */}
          {kelurahanFeatures.map((kel) => {
            const isHovered = hoveredKel === kel.name;
            const isSelected = selectedKelName === kel.name;
            const w = weatherByName[kel.name];
            return (
              <path
                key={`kel-${kel.name}-${kel.kecamatan}`}
                d={kel.path}
                fill={getHeatColor(w?.weather?.temperature ?? null)}
                fillOpacity={isSelected ? 1 : isHovered ? 0.95 : 0.75}
                stroke={isSelected ? "#1e293b" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                onMouseEnter={() => {
                  setHoveredKel(kel.name);
                  setHoveredKec(kel.kecamatan ?? null);
                }}
                onMouseLeave={() => {
                  setHoveredKel(null);
                }}
                onClick={() => onSelect(kel.name, kel.kecamatan ?? "")}
                className="cursor-pointer transition-all duration-150"
              />
            );
          })}

          {/* Kecamatan labels */}
          {kecamatanFeatures.map((kec) => (
            <text
              key={`label-${kec.name}`}
              x={kec.centroid[0]}
              y={kec.centroid[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8"
              fontWeight="600"
              fill="#1e293b"
              fillOpacity={0.7}
              pointerEvents="none"
              style={{ textShadow: "0 0 4px white, 0 0 4px white, 0 0 4px white" }}
            >
              {kec.name.replace("Medan ", "")}
            </text>
          ))}

          {/* Heat legend — gradient bar */}
          <defs>
            <linearGradient id="heatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(240, 70%, 55%)" />
              <stop offset="25%" stopColor="hsl(180, 70%, 55%)" />
              <stop offset="50%" stopColor="hsl(120, 70%, 55%)" />
              <stop offset="75%" stopColor="hsl(60, 70%, 55%)" />
              <stop offset="100%" stopColor="hsl(0, 70%, 55%)" />
            </linearGradient>
          </defs>
          {(() => {
            const h = parseInt(viewBox.split(" ")[3], 10) || 1000;
            return (
              <>
                <rect x="20" y={h - 35} width="200" height="10" rx="2" fill="url(#heatGradient)" />
                <text x="20" y={h - 10} fontSize="7" fill="#64748b">18°C</text>
                <text x="220" y={h - 10} fontSize="7" fill="#64748b" textAnchor="end">38°C</text>
                <text x="120" y={h - 10} fontSize="7" fill="#64748b" textAnchor="middle">28°C</text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Hover tooltip */}
      {hoveredKel && (
        <div className="absolute bottom-4 left-4 bg-zinc-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-10">
          {hoveredKel}
          {hoveredKec && (
            <span className="text-zinc-400 ml-1">({hoveredKec})</span>
          )}
          {weatherByName[hoveredKel]?.weather?.temperature != null && (
            <span
              className="ml-2 font-semibold"
              style={{ color: getHeatColor(weatherByName[hoveredKel].weather.temperature) }}
            >
              {Math.round(weatherByName[hoveredKel].weather.temperature)}°C
            </span>
          )}
        </div>
      )}
    </div>
  );
}
