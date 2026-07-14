"use client";

import { useEffect, useState } from "react";
import type { Metadata } from "next";

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

export default function ForecastPage() {
  const [locations, setLocations] = useState<Kecamatan[]>([]);
  const [selectedKec, setSelectedKec] = useState("");
  const [selectedKel, setSelectedKel] = useState("");
  const [forecast, setForecast] = useState<ForecastDistrict[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch locations on mount
  useEffect(() => {
    fetch("/api/weather/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d?.data ?? []));
  }, []);

  // Fetch forecast when selection changes
  useEffect(() => {
    if (!selectedKel) {
      setForecast([]);
      return;
    }
    setLoading(true);
    fetch(`/api/weather/forecast?adm4=${selectedKel}&limit=12`)
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
          Prediksi cuaca berdasarkan data observasi terkini per kelurahan.
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
            onChange={(e) => setSelectedKel(e.target.value)}
            disabled={!selectedKec}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">
              {selectedKec ? "— Pilih Kelurahan —" : "Pilih kecamatan dulu"}
            </option>
            {kelurahanList.map((kel) => (
              <option key={kel.adm4} value={kel.adm4}>
                {kel.name} ({kel.adm4})
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
        <div className="space-y-6">
          {forecast.map((f) => (
            <div
              key={f.district}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5"
            >
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
                {f.district}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="text-left py-2 px-3 text-zinc-500 font-medium">
                        Waktu
                      </th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-medium">
                        Suhu
                      </th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-medium">
                        Kelembaban
                      </th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-medium">
                        Hujan
                      </th>
                      <th className="text-left py-2 px-3 text-zinc-500 font-medium">
                        Kondisi
                      </th>
                      <th className="text-left py-2 px-3 text-zinc-500 font-medium">
                        Klasifikasi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.observations.map((obs, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">
                          {new Date(obs.observed_at).toLocaleString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-zinc-900 dark:text-white">
                          {obs.temperature != null
                            ? `${Math.round(obs.temperature)}°C`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-600 dark:text-zinc-400">
                          {obs.humidity ?? "—"}%
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-600 dark:text-zinc-400">
                          {obs.rainfall ?? "—"} mm
                        </td>
                        <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">
                          {obs.condition ?? "—"}
                        </td>
                        <td className="py-2 px-3">
                          {obs.temp_classification && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {obs.temp_classification}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
