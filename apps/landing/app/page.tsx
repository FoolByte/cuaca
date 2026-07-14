import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentWeather, getAlerts } from "@/lib/api";
import HomeClient from "./components/HomeClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BMKG Cuaca Medan",
  description:
    "Dashboard cuaca real-time Kota Medan — data dari BMKG untuk 21 kecamatan.",
};

export default async function HomePage() {
  const [data, alertData] = await Promise.all([
    getCurrentWeather(),
    getAlerts(),
  ]);
  const weather = data?.data ?? [];
  const alerts = alertData?.alerts ?? [];
  const timestamp = data?.meta?.timestamp;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 dark:from-sky-900 dark:via-blue-900 dark:to-indigo-950">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sky-200 text-sm font-medium tracking-wider uppercase mb-2">
              Badan Meteorologi, Klimatologi, dan Geofisika
            </p>
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-3 tracking-tight">
              Cuaca Medan
            </h1>
            <p className="text-sky-200 text-lg max-w-xl mx-auto mb-6">
              Data cuaca real-time untuk 21 kecamatan di Kota Medan
            </p>
            {timestamp && (
              <p className="text-sky-300/70 text-xs mb-8">
                Diperbarui:{" "}
                {new Date(timestamp).toLocaleString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {/* Alert banner */}
            {alerts.length > 0 && (
              <div className="max-w-2xl mx-auto mb-8">
                <div className="bg-yellow-500/20 backdrop-blur border border-yellow-400/30 rounded-xl px-4 py-3 text-sm">
                  <span className="text-yellow-300 font-bold">⚠️ Peringatan: </span>
                  <span className="text-yellow-100">{alerts[0].headline}</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/cuaca"
                className="px-6 py-3 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg shadow-blue-900/20"
              >
                🗺️ Peta Cuaca
              </Link>
              <Link
                href="/forecast"
                className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 backdrop-blur transition-colors"
              >
                📊 Forecast
              </Link>
              <Link
                href="/trend"
                className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 backdrop-blur transition-colors"
              >
                📈 Trend
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {weather.length > 0 ? (
          <HomeClient weather={weather} />
        ) : (
          <div className="text-center py-16">
            <p className="text-zinc-400 text-lg">
              Belum ada data cuaca. Pastikan ETL pipeline sudah berjalan.
            </p>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: "/forecast",
              icon: "📊",
              bg: "from-orange-500 to-rose-500",
              title: "Forecast",
              desc: "Prediksi cuaca 3 hari ke depan",
            },
            {
              href: "/trend",
              icon: "📈",
              bg: "from-emerald-500 to-teal-500",
              title: "Trend",
              desc: "Analisis tren suhu & kelembaban",
            },
            {
              href: "/heatmap",
              icon: "🗺️",
              bg: "from-violet-500 to-purple-500",
              title: "Heatmap",
              desc: "Peta persebaran suhu per kecamatan",
            },
            {
              href: "/cuaca",
              icon: "🌤️",
              bg: "from-sky-500 to-blue-500",
              title: "Peta Interaktif",
              desc: "Peta SVG kelurahan Kota Medan",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative overflow-hidden rounded-2xl p-5 hover:shadow-lg transition-all"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.bg} opacity-10 group-hover:opacity-20 transition-opacity`}
              />
              <div className="relative">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="font-bold mt-2 text-zinc-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {item.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer attribution */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6">
        <p className="text-center text-xs text-zinc-400">
          Data dari{" "}
          <a
            href="https://www.bmkg.go.id"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-600"
          >
            BMKG
          </a>{" "}
          (Badan Meteorologi, Klimatologi, dan Geofisika)
        </p>
      </footer>
    </div>
  );
}
