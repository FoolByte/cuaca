import type { Metadata } from "next";
import { getTrend } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trend Cuaca",
  description:
    "Analisis tren suhu, kelembaban, dan curah hujan Kota Medan.",
};

export default async function TrendPage() {
  const data = await getTrend(24);
  const trends = data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Trend Cuaca
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Moving average (3 jam) dan perubahan antar periode per kecamatan.
        </p>
      </div>

      {trends.length > 0 ? (
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
      ) : (
        <div className="text-center py-16">
          <p className="text-zinc-500">Belum ada data trend.</p>
        </div>
      )}
    </div>
  );
}
