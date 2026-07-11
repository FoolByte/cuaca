const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetchAPI<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/weather${endpoint}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface CurrentWeatherData {
  data: Array<{
    district: string;
    location: { latitude: number | null; longitude: number | null };
    weather: {
      temperature: number | null;
      humidity: number | null;
      pressure: number | null;
      wind_direction: string | null;
      wind_speed: number | null;
      rainfall: number | null;
      visibility: number | null;
      cloud_coverage: number | null;
    };
    classification: {
      temperature: string | null;
      humidity: string | null;
      wind: string | null;
      rainfall: string | null;
      condition: string | null;
    };
    observed_at: string;
    source: string | null;
  }>;
  meta: { count: number; timestamp: string };
}

export interface ForecastData {
  data: Array<{
    district: string;
    observations: Array<{
      temperature: number | null;
      humidity: number | null;
      rainfall: number | null;
      wind_speed: number | null;
      condition: string | null;
      temp_classification: string | null;
      aggregates: {
        temp_avg: number | null;
        temp_max: number | null;
        temp_min: number | null;
      };
      observed_at: string;
    }>;
  }>;
  meta: { total_observations: number; limit: number; timestamp: string };
}

export interface TrendData {
  data: Array<{
    district: string;
    trend: Array<{
      temperature: number | null;
      humidity: number | null;
      rainfall: number | null;
      moving_averages: {
        temperature: number | null;
        humidity: number | null;
        rainfall: number | null;
      };
      deltas: { temperature: number | null; humidity: number | null };
      observed_at: string;
    }>;
  }>;
  meta: { total_points: number; limit: number; timestamp: string };
}

export interface HeatmapData {
  data: Array<{
    district: string;
    coordinates: { latitude: number | null; longitude: number | null };
    metrics: {
      avg_temperature: number | null;
      avg_rainfall: number | null;
      avg_humidity: number | null;
      avg_cloud_coverage: number | null;
    };
    data_points: number;
  }>;
  meta: { lookback_hours: number; locations: number; timestamp: string };
}

export const getCurrentWeather = () =>
  fetchAPI<CurrentWeatherData>("/current");

export const getForecast = (limit = 12) =>
  fetchAPI<ForecastData>(`/forecast?limit=${limit}`);

export const getTrend = (limit = 24) =>
  fetchAPI<TrendData>(`/trend?limit=${limit}`);

export const getHeatmap = (hours = 24) =>
  fetchAPI<HeatmapData>(`/heatmap?hours=${hours}`);
