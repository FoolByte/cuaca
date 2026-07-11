"use client";

import { useEffect, useState } from "react";
import type { HeatmapData } from "@/lib/api";

interface MapPoint {
  district: string;
  lat: number;
  lng: number;
  avg_temp: number | null;
  avg_rainfall: number | null;
  avg_humidity: number | null;
}

function getColor(temp: number | null): string {
  if (temp == null) return "#94a3b8";
  if (temp >= 38) return "#dc2626";
  if (temp >= 33) return "#f97316";
  if (temp >= 28) return "#eab308";
  if (temp >= 20) return "#22c55e";
  return "#3b82f6";
}

export default function LeafletMap({ data }: { data: HeatmapData["data"] }) {
  const [MapComp, setMapComp] = useState<React.ComponentType<Record<string, never>> | null>(null);

  useEffect(() => {
    Promise.all([
      import("react-leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([rl]) => {
      setMapComp(() => {
        const { MapContainer, TileLayer, CircleMarker, Popup } = rl;
        return function Map() {
          return (
            <MapContainer
              center={[3.5958, 98.675]}
              zoom={12}
              style={{ height: "500px", width: "100%" }}
              className="rounded-xl z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {data.map((point) => {
                if (!point.coordinates.latitude || !point.coordinates.longitude)
                  return null;
                return (
                  <CircleMarker
                    key={point.district}
                    center={[
                      point.coordinates.latitude,
                      point.coordinates.longitude,
                    ]}
                    radius={12}
                    fillColor={getColor(point.metrics.avg_temperature)}
                    color="#fff"
                    weight={2}
                    fillOpacity={0.8}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{point.district}</strong>
                        <br />
                        Suhu: {point.metrics.avg_temperature ?? "—"}°C
                        <br />
                        Hujan: {point.metrics.avg_rainfall ?? "—"} mm
                        <br />
                        Kelembaban: {point.metrics.avg_humidity ?? "—"}%
                        <br />
                        <span className="text-xs text-gray-500">
                          {point.data_points} data points
                        </span>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          );
        };
      });
    });
  }, [data]);

  if (!MapComp) {
    return (
      <div className="h-[500px] bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
        <p className="text-zinc-500">Memuat peta...</p>
      </div>
    );
  }

  return <MapComp />;
}
