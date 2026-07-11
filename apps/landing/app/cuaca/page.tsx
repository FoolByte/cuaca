import type { Metadata } from "next";
import { getCurrentWeather } from "@/lib/api";
import WeatherCard from "../components/WeatherCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cuaca Saat Ini",
  description:
    "Cuaca terkini untuk 21 kecamatan Kota Medan — suhu, kelembaban, angin, dan curah hujan.",
};

export default async function CuacaPage() {
  const data = await getCurrentWeather();
  const weather = data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Cuaca Saat Ini
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Data cuaca terbaru untuk seluruh kecamatan di Kota Medan.
        </p>
        {data?.meta?.timestamp && (
          <p className="text-xs text-zinc-400 mt-1">
            Terakhir diperbarui:{" "}
            {new Date(data.meta.timestamp).toLocaleString("id-ID")}
          </p>
        )}
      </div>

      {weather.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weather.map((w) => (
            <WeatherCard
              key={w.district}
              district={w.district}
              temperature={w.weather.temperature}
              humidity={w.weather.humidity}
              condition={w.classification.condition}
              wind_speed={w.weather.wind_speed}
              rainfall={w.weather.rainfall}
              temp_class={w.classification.temperature}
              observed_at={w.observed_at}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-zinc-500">
            Belum ada data cuaca. Jalankan ETL pipeline terlebih dahulu.
          </p>
        </div>
      )}
    </div>
  );
}
