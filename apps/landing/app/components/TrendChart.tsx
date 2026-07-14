"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface TrendPoint {
  observed_at: string;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  moving_averages: {
    temperature: number | null;
    humidity: number | null;
    rainfall: number | null;
  };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  // Sort ascending by time for chart
  const sorted = [...data].sort(
    (a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime()
  );

  const chartData = sorted.map((p) => ({
    time: p.observed_at,
    label: formatShortTime(p.observed_at),
    fullLabel: formatTime(p.observed_at),
    suhu: p.temperature,
    suhuMA: p.moving_averages.temperature,
    kelembaban: p.humidity,
    kelembabanMA: p.moving_averages.humidity,
    hujan: p.rainfall,
  }));

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#d4d4d8" }}
          />
          <YAxis
            yAxisId="temp"
            tick={{ fontSize: 11, fill: "#ef4444" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}°`}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="humid"
            orientation="right"
            tick={{ fontSize: 11, fill: "#3b82f6" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "12px",
            }}
            labelFormatter={(label, payload) =>
              payload?.[0]?.payload?.fullLabel ?? label
            }
            formatter={(value, name) => {
              if (value == null) return ["—", name];
              const unit = String(name).includes("Kelembaban") ? "%" : "°C";
              return [`${value}${unit}`, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="suhu"
            name="Suhu"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3, fill: "#ef4444" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="suhuMA"
            name="Suhu MA(3)"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="humid"
            type="monotone"
            dataKey="kelembaban"
            name="Kelembaban"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#3b82f6" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
          <Line
            yAxisId="humid"
            type="monotone"
            dataKey="kelembabanMA"
            name="Kelembaban MA(3)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
