interface WeatherCardProps {
  district: string;
  temperature: number | null;
  humidity: number | null;
  condition: string | null;
  wind_speed: number | null;
  rainfall: number | null;
  temp_class?: string | null;
  observed_at?: string;
}

export default function WeatherCard({
  district,
  temperature,
  humidity,
  condition,
  wind_speed,
  rainfall,
  temp_class,
  observed_at,
}: WeatherCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {district}
        </h3>
        {temp_class && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {temp_class}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold text-zinc-900 dark:text-white">
          {temperature != null ? Math.round(temperature) : "—"}
        </span>
        <span className="text-xl text-zinc-500">°C</span>
      </div>

      {condition && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
          {condition}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          <span className="block font-medium text-zinc-700 dark:text-zinc-300">
            💧 {humidity ?? "—"}%
          </span>
          Kelembaban
        </div>
        <div>
          <span className="block font-medium text-zinc-700 dark:text-zinc-300">
            💨 {wind_speed ?? "—"} km/h
          </span>
          Angin
        </div>
        <div>
          <span className="block font-medium text-zinc-700 dark:text-zinc-300">
            🌧 {rainfall ?? "—"} mm
          </span>
          Hujan
        </div>
      </div>

      {observed_at && (
        <p className="mt-3 text-xs text-zinc-400">
          {new Date(observed_at).toLocaleString("id-ID")}
        </p>
      )}
    </div>
  );
}
