import type { Metadata } from "next";
import { getForecast } from "@/lib/api";

export const metadata: Metadata = {
  title: "Forecast",
  description:
    "Prediksi cuaca Kota Medan berdasarkan data historis dan tren terkini.",
};

export default async function ForecastPage() {
  const data = await getForecast(12);
  const forecasts = data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Forecast Cuaca
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Prediksi cuaca berdasarkan data observasi terkini per kecamatan.
        </p>
      </div>

      {forecasts.length > 0 ? (
        <div className="space-y-6">
          {forecasts.map((f) => (
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
      ) : (
        <div className="text-center py-16">
          <p className="text-zinc-500">Belum ada data forecast.</p>
        </div>
      )}
    </div>
  );
}
