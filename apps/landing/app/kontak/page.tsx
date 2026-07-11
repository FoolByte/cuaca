import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi pengembang Weather Data Platform Medan.",
};

export default function KontakPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
        Kontak
      </h1>

      <div className="space-y-6">
        <section className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
            Hubungi Kami
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Punya pertanyaan, saran, atau menemukan bug? Silakan hubungi melalui
            channel berikut:
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">📧</span>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  Email
                </h3>
                <a
                  href="mailto:admin@cuacamedan.id"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  admin@cuacamedan.id
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl">🐙</span>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  GitHub
                </h3>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  github.com/weather-data-platform-medan
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl">💼</span>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  LinkedIn
                </h3>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  linkedin.com/in/weather-data-engineer
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
            Sumber Data
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Data cuaca berasal dari{" "}
            <a
              href="https://api.bmkg.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              BMKG API Publik
            </a>
            . Data diperbarui setiap 10 menit melalui pipeline ETL yang
            dijadwalkan oleh Apache Airflow.
          </p>
        </section>

        <section className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
            Disclaimer
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Platform ini dibangun sebagai project portfolio. Data cuaca
            disediakan sebagaimana adanya dari sumber resmi BMKG. Untuk informasi
            cuaca resmi, kunjungi{" "}
            <a
              href="https://www.bmkg.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              bmkg.go.id
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
