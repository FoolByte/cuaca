"use client";

import { useEffect, useState } from "react";

interface Kelurahan {
  adm4: string;
  name: string;
}

interface Kecamatan {
  kecamatan: string;
  kelurahan: Kelurahan[];
}

interface TrendPoint {
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  moving_averages: {
    temperature: number | null;
    humidity: number | null;
    rainfall: number | null;
  };
  deltas: { temperature: number | null; humidity: number | null };
  observed_at: string;
}

interface TrendDistrict {
  district: string;
  trend: TrendPoint[];
}

export default function TrendPage() {
  const [locations, setLocations] = useState<Kecamatan[]>([]);
  const [selectedKec, setSelectedKec] = useState("");
  const [selectedKel, setSelectedKel] = useState("");
  const [trends, setTrends] = useState<TrendDistrict[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/weather/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d?.data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedKel) {
      setTrends([]);
      return;
    }
    setLoading(true);
    fetch(`/api/weather/trend?adm4=${selectedKel}&limit=24`)
      .then((r) => r.json())
      .then((d) => setTrends(d?.data ?? []))
      .finally(() => setLoading(false));
  }, [selectedKel]);

  const kelurahanList =
    locations.find((k) => k.kecamatan === selectedKec)?.kelurahan ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Trend Cuaca
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Moving average (3 jam) dan perubahan antar periode per kelurahan.
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

      {!selectedKel && (
        <div className="text-center py-16">
          <p className="text-zinc-500">
            Pilih kecamatan dan kelurahan untuk melihat data trend.
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <p className="text-zinc-500">Memuat data...</p>
        </div>
      )}

      {!loading && selectedKel && trends.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500">Belum ada data trend.</p>
        </div>
      )}

      {!loading && trends.length > 0 && (
        <div className="space-y-6">
          {trends.map((t) => (
            <div
              key={t.district}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5"
            >
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
                {t.district}
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
                        MA(3h)
                      </th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-medium">
                        Δ Suhu
                      </th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-medium">
                        Kelembaban
                      </th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-medium">
                        Δ Kelembaban
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.trend.map((p, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">
                          {new Date(p.observed_at).toLocaleString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-zinc-900 dark:text-white">
                          {p.temperature != null
                            ? `${Math.round(p.temperature)}°C`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400">
                          {p.moving_averages.temperature ?? "—"}°C
                        </td>
                        <td className="py-2 px-3 text-right">
                          {p.deltas.temperature != null ? (
                            <span
                              className={
                                p.deltas.temperature > 0
                                  ? "text-red-500"
                                  : p.deltas.temperature < 0
                                    ? "text-green-500"
                                    : "text-zinc-400"
                              }
                            >
                              {p.deltas.temperature > 0 ? "+" : ""}
                              {p.deltas.temperature}°C
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-600 dark:text-zinc-400">
                          {p.humidity ?? "—"}%
                        </td>
                        <td className="py-2 px-3 text-right">
                          {p.deltas.humidity != null ? (
                            <span
                              className={
                                p.deltas.humidity > 0
                                  ? "text-blue-500"
                                  : p.deltas.humidity < 0
                                    ? "text-orange-500"
                                    : "text-zinc-400"
                              }
                            >
                              {p.deltas.humidity > 0 ? "+" : ""}
                              {p.deltas.humidity}%
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
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
