"use client";

import { useState } from "react";
import WeatherIcon from "./WeatherIcon";
import Icon from "./Icon";

interface Props {
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  wind_speed: number | null;
  condition: number;
  condition_desc: string | null;
  isDay: boolean;
  timeLabel: string;
  dateLabel: string;
  classification: string | null;
  delay?: number;
}

function getTempColor(temp: number | null): string {
  if (temp == null) return "#94a3b8";
  if (temp >= 35) return "#ef4444";
  if (temp >= 32) return "#f97316";
  if (temp >= 28) return "#eab308";
  if (temp >= 24) return "#22c55e";
  return "#3b82f6";
}

export default function ForecastCard({
  temperature,
  humidity,
  rainfall,
  wind_speed,
  condition,
  condition_desc,
  isDay,
  timeLabel,
  dateLabel,
  classification,
  delay = 0,
}: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex-shrink-0 w-36 group"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`
          rounded-2xl p-4 text-center transition-all duration-300 cursor-pointer
          ${hovered ? "scale-105 shadow-xl z-10" : "shadow-md"}
          ${isDay
            ? "bg-gradient-to-b from-sky-100 to-white dark:from-sky-900/40 dark:to-zinc-800"
            : "bg-gradient-to-b from-indigo-900 to-slate-800 dark:from-indigo-950 dark:to-slate-900"
          }
        `}
      >
        {/* Date & Time */}
        <p className={`text-[10px] font-medium mb-1 ${isDay ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400"}`}>
          {dateLabel}
        </p>
        <p className={`text-sm font-bold mb-2 ${isDay ? "text-zinc-700 dark:text-zinc-200" : "text-white"}`}>
          {timeLabel}
        </p>

        {/* Day/Night badge */}
        <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full mb-2 ${
          isDay
            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
        }`}>
          {isDay ? <><Icon name="sun" size={10} /> Siang</> : <><Icon name="moon" size={10} /> Malam</>}
        </span>

        {/* Weather Icon */}
        <div className="flex justify-center my-2">
          <WeatherIcon condition={condition} isDay={isDay} size={48} />
        </div>

        {/* Condition */}
        <p className={`text-xs mb-2 ${isDay ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-300"}`}>
          {condition_desc ?? "—"}
        </p>

        {/* Temperature */}
        <p className="text-2xl font-bold" style={{ color: getTempColor(temperature) }}>
          {temperature != null ? Math.round(temperature) : "—"}°
        </p>

        {/* Classification badge */}
        {classification && (
          <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 mt-1">
            {classification}
          </span>
        )}
      </div>

      {/* Hover detail card */}
      {hovered && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-52 bg-zinc-900 dark:bg-zinc-700 text-white rounded-xl shadow-2xl p-4 z-20 pointer-events-none
          animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center mb-2">
            <p className="text-sm font-bold">{condition_desc ?? "Cuaca"}</p>
            <p className="text-[10px] text-zinc-400">{dateLabel} {timeLabel}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-800 dark:bg-zinc-600 rounded-lg p-2 text-center">
              <p className="text-zinc-400 text-[10px]">Kelembaban</p>
              <p className="font-bold text-blue-400">{humidity ?? "—"}%</p>
            </div>
            <div className="bg-zinc-800 dark:bg-zinc-600 rounded-lg p-2 text-center">
              <p className="text-zinc-400 text-[10px]">Hujan</p>
              <p className="font-bold text-cyan-400">{rainfall ?? "—"} mm</p>
            </div>
            <div className="bg-zinc-800 dark:bg-zinc-600 rounded-lg p-2 text-center">
              <p className="text-zinc-400 text-[10px]">Angin</p>
              <p className="font-bold text-emerald-400">{wind_speed ?? "—"} km/h</p>
            </div>
            <div className="bg-zinc-800 dark:bg-zinc-600 rounded-lg p-2 text-center">
              <p className="text-zinc-400 text-[10px]">Suhu</p>
              <p className="font-bold" style={{ color: getTempColor(temperature) }}>
                {temperature != null ? `${Math.round(temperature)}°C` : "—"}
              </p>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
            <div className="w-3 h-3 bg-zinc-900 dark:bg-zinc-700 rotate-45 -translate-y-1.5" />
          </div>
        </div>
      )}
    </div>
  );
}
