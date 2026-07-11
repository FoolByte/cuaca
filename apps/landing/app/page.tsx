import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentWeather } from "@/lib/api";
import WeatherCard from "./components/WeatherCard";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Dashboard cuaca Kota Medan — data real-time dari BMKG untuk 21 kecamatan.",
};

export default async function HomePage() {
  const data = await getCurrentWeather();
  const weather = data?.data ?? [];
  const preview = weather.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="text-center py-12 mb-8">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4 sm:text-5xl">
          🌤 Cuaca Kota Medan
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-8">
          Informasi cuaca real-time untuk 21 kecamatan di Kota Medan.
          Data dari BMKG, diperbarui setiap 10 menit.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/cuaca"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Lihat Cuaca Sekarang
          </Link>
          <Link
            href="/heatmap"
            className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Heatmap
          </Link>
        </div>
      </section>

      {/* Overview cards */}
      {preview.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              Cuaca Terkini
            </h2>
            <Link
              href="/cuaca"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Lihat semua →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {preview.map((w) => (
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
        </section>
      )}

      {preview.length === 0 && (
        <section className="text-center py-16">
          <p className="text-zinc-500 dark:text-zinc-400">
            Belum ada data cuaca. Pastikan ETL pipeline sudah berjalan.
          </p>
        </section>
      )}

      {/* Quick links */}
      <section className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/forecast", icon: "📊", title: "Forecast", desc: "Prediksi cuaca beberapa jam ke depan" },
          { href: "/trend", icon: "📈", title: "Trend", desc: "Analisis tren suhu dan kelembaban" },
          { href: "/heatmap", icon: "🗺", title: "Heatmap", desc: "Peta persebaran suhu per kecamatan" },
          { href: "/tentang", icon: "ℹ️", title: "Tentang", desc: "Tentang platform data cuaca ini" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">{item.icon}</span>
            <h3 className="font-semibold mt-2 text-zinc-900 dark:text-zinc-100">
              {item.title}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {item.desc}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
