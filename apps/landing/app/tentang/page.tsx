import type { Metadata } from "next";
import Icon from "../components/Icon";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "Tentang Weather Data Platform Medan — portfolio project Junior Data Engineer.",
};

export default function TentangPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
        Tentang Platform Ini
      </h1>

      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Icon name="cloud-sun" size={20} /> Apa ini?</h2>
          <p>
            Weather Data Platform Medan adalah platform pengolahan data cuaca
            untuk Kota Medan. Platform ini mengambil data dari BMKG (Badan
            Meteorologi, Klimatologi, dan Geofisika), memprosesnya melalui ETL
            pipeline, dan menyajikan informasi cuaca real-time untuk 21 kecamatan.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Icon name="gauge" size={20} /> Teknologi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {[
              { name: "ETL Pipeline", desc: "Python, Pandas, Requests" },
              { name: "Database", desc: "PostgreSQL (Star Schema DWH)" },
              { name: "Scheduler", desc: "Apache Airflow" },
              { name: "Frontend", desc: "Next.js, TypeScript, Tailwind CSS" },
              { name: "Dashboard", desc: "Metabase" },
              { name: "Container", desc: "Docker, Docker Compose" },
            ].map((tech) => (
              <div
                key={tech.name}
                className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4"
              >
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {tech.name}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {tech.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Icon name="bar-chart" size={20} /> Arsitektur</h2>
          <p>
            Data mengalir dari BMKG API → ETL Extract → Transform (cleaning,
            klasifikasi, anomaly detection) → Load ke Data Warehouse (star
            schema) → Dashboard Metabase & Landing Page Next.js.
          </p>
          <p>
            Pipeline dijadwalkan setiap 10 menit oleh Apache Airflow, memastikan
            data selalu terkini.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Icon name="info" size={20} /> Tujuan</h2>
          <p>
            Project ini dibangun sebagai portfolio profesional untuk menunjukkan
            kemampuan Data Engineer: ETL pipeline, data warehouse design,
            scheduler, dashboard analytics, dan web development.
          </p>
        </section>
      </div>
    </div>
  );
}
