"use client";

import { useEffect, useState } from "react";
import ForecastCard from "../components/ForecastCard";

interface Kelurahan {
  adm4: string;
  name: string;
}

interface Kecamatan {
  kecamatan: string;
  kelurahan: Kelurahan[];
}

interface ForecastObs {
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  wind_speed: number | null;
  condition: string | null;
  condition_code: number;
  temp_classification: string | null;
  aggregates: {
    temp_avg: number | null;
    temp_max: number | null;
    temp_min: number | null;
  };
  observed_at: string;
}

interface ForecastDistrict {
  district: string;
  observations: ForecastObs[];
}

/** BMKG weather condition code from condition_desc */
const CONDITION_CODES: Record<string, number> = {
  "Cerah": 0,
  "Cerah Berawan": 2,
  "Berawan": 3,
  "Berawan Tebal": 4,
  "Udara Kabur": 10,
  "Kabut": 45,
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

function isDaytime(isoStr: string): boolean {
  const h = new Date(isoStr).getHours();
  return h >= 6 && h < 18;
}

function groupByDay(
  obs: ForecastObs[]
): Map<string, ForecastObs[]> {
  // Sort ascending first
  const sorted = [...obs].sort(
    (a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime()
  );
  const map = new Map<string, ForecastObs[]>();
  for (const o of sorted) {
    const d = new Date(o.observed_at);
    const key = d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  return map;
}

export default function ForecastPage() {
  const [locations, setLocations] = useState<Kecamatan[]>([]);
  const [selectedKec, setSelectedKec] = useState("");
  const [selectedKel, setSelectedKel] = useState("");
  const [selectedKelName, setSelectedKelName] = useState("");
  const [forecast, setForecast] = useState<ForecastDistrict[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/weather/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d?.data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedKel) {
      setForecast([]);
      return;
    }
    setLoading(true);
    fetch(`/api/weather/forecast?adm4=${selectedKel}&limit=24`)
      .then((r) => r.json())
      .then((d) => setForecast(d?.data ?? []))
      .finally(() => setLoading(false));
  }, [selectedKel]);

  const kelurahanList =
    locations.find((k) => k.kecamatan === selectedKec)?.kelurahan ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Forecast Cuaca
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Prediksi cuaca 3 hari ke depan per kelurahan.
        </p>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Kecamatan
          </label>
          <select
            value={selectedKec}
            onChange={(e) => {
              setSelectedKec(e.target.value);
              setSelectedKel("");
              setSelectedKelName("");
            }}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">— Pilih Kecamatan —</option>
            {locations.map((k) => (
              <option key={k.kecamatan} value={k.kecamatan}>
                {k.kecamatan}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Kelurahan
          </label>
          <select
            value={selectedKel}
            onChange={(e) => {
              setSelectedKel(e.target.value);
              const kel = kelurahanList.find((k) => k.adm4 === e.target.value);
              setSelectedKelName(kel?.name ?? "");
            }}
            disabled={!selectedKec}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">
              {selectedKec ? "— Pilih Kelurahan —" : "Pilih kecamatan dulu"}
            </option>
            {kelurahanList.map((kel) => (
              <option key={kel.adm4} value={kel.adm4}>
                {kel.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {!selectedKel && (
        <div className="text-center py-16">
          <p className="text-zinc-500">
            Pilih kecamatan dan kelurahan untuk melihat data forecast.
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <p className="text-zinc-500">Memuat data...</p>
        </div>
      )}

      {!loading && selectedKel && forecast.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500">Belum ada data forecast.</p>
        </div>
      )}

      {!loading && forecast.length > 0 && (
        <div className="space-y-8">
          {forecast.map((f) => {
            const byDay = groupByDay(f.observations);
            return (
              <div
                key={f.district}
                className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6"
              >
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
                  {selectedKelName || f.district}
                </h2>
                {[...byDay.entries()].map(([dayLabel, obs], dayIdx) => (
                  <div key={dayLabel} className={dayIdx > 0 ? "mt-6" : ""}>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">
                      {dayLabel}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {obs.map((o, i) => (
                        <ForecastCard
                          key={i}
                          temperature={o.temperature}
                          humidity={o.humidity}
                          rainfall={o.rainfall}
                          wind_speed={o.wind_speed}
                          condition={getConditionCode(o.condition)}
                          condition_desc={o.condition}
                          isDay={isDaytime(o.observed_at)}
                          timeLabel={new Date(o.observed_at).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                          dateLabel={new Date(o.observed_at).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short" }
                          )}
                          classification={o.temp_classification}
                          delay={i * 80}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
