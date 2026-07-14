import Icon from "./Icon";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
              <Icon name="cloud-sun" size={18} /> Cuaca Medan
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Platform data cuaca Kota Medan. Data dari BMKG, diupdate setiap 10 menit.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Navigasi
            </h3>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
              <li><a href="/cuaca" className="hover:text-blue-600">Cuaca Saat Ini</a></li>
              <li><a href="/forecast" className="hover:text-blue-600">Forecast</a></li>
              <li><a href="/trend" className="hover:text-blue-600">Trend Cuaca</a></li>
              <li><a href="/heatmap" className="hover:text-blue-600">Heatmap</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Teknologi
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Next.js · PostgreSQL · Apache Airflow · Metabase
            </p>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} Weather Data Platform Medan — Portfolio Project
        </div>
      </div>
    </footer>
  );
}
