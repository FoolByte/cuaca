"use client";

import { useEffect, useState } from "react";
import TrendChart from "../components/TrendChart";

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
  const [selectedKelName, setSelectedKelName] = useState("");
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
                {selectedKelName || t.district}
              </h2>
              <TrendChart data={t.trend} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
