import type { Metadata } from "next";
import { getHeatmap } from "@/lib/api";
import LeafletMap from "../components/LeafletMap";

export const metadata: Metadata = {
  title: "Heatmap",
  description:
    "Peta persebaran suhu dan curah hujan Kota Medan per kecamatan.",
};

export default async function HeatmapPage() {
  const data = await getHeatmap(24);
  const points = data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Heatmap Cuaca
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Peta persebaran suhu rata-rata per kecamatan (24 jam terakhir).
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          {[
            { color: "bg-red-600", label: "≥ 38°C Sangat Panas" },
            { color: "bg-orange-500", label: "≥ 33°C Panas" },
            { color: "bg-yellow-500", label: "≥ 28°C Hangat" },
            { color: "bg-green-500", label: "≥ 20°C Normal" },
            { color: "bg-blue-500", label: "< 20°C Dingin" },
          ].map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
            >
              <span
                className={`w-3 h-3 rounded-full ${item.color}`}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {points.length > 0 ? (
        <>
          {/* Map */}
          <div className="mb-8 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
            <LeafletMap data={points} />
          </div>

          {/* Data table */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-3 px-4 text-zinc-500 font-medium">
                    Kecamatan
                  </th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium">
                    Suhu Rata-rata
                  </th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium">
                    Hujan Rata-rata
                  </th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium">
                    Kelembaban
                  </th>
                  <th className="text-right py-3 px-4 text-zinc-500 font-medium">
                    Data Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr
                    key={p.district}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                      {p.district}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{
                          backgroundColor: getColor(p.metrics.avg_temperature),
                        }}
                      />
                      {p.metrics.avg_temperature ?? "—"}°C
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600 dark:text-zinc-400">
                      {p.metrics.avg_rainfall ?? "—"} mm
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600 dark:text-zinc-400">
                      {p.metrics.avg_humidity ?? "—"}%
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-500">
                      {p.data_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-zinc-500">Belum ada data heatmap.</p>
        </div>
      )}
    </div>
  );
}

function getColor(temp: number | null): string {
  if (temp == null) return "#94a3b8";
  if (temp >= 38) return "#dc2626";
  if (temp >= 33) return "#f97316";
  if (temp >= 28) return "#eab308";
  if (temp >= 20) return "#22c55e";
  return "#3b82f6";
}
