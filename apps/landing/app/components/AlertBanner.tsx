"use client";

import { useState } from "react";
import type { AlertData } from "@/lib/api";

type Alert = AlertData["alerts"][number];

const SEVERITY_COLORS: Record<string, string> = {
  Extreme: "bg-red-100 border-red-400 text-red-800 dark:bg-red-900/40 dark:border-red-600 dark:text-red-200",
  Severe: "bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-900/40 dark:border-orange-600 dark:text-orange-200",
  Moderate: "bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/40 dark:border-yellow-600 dark:text-yellow-200",
  Minor: "bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-200",
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  // Show the most severe alert
  const severityOrder = ["Extreme", "Severe", "Moderate", "Minor"];
  const sorted = [...alerts].sort(
    (a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );
  const primary = sorted[0];
  const colorClass = SEVERITY_COLORS[primary.severity] ?? SEVERITY_COLORS.Moderate;

  return (
    <div className={`mb-3 rounded-xl border px-4 py-3 ${colorClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wide">
              ⚠️ {primary.severity}
            </span>
            <span className="text-xs opacity-70">•</span>
            <span className="text-xs font-medium">{primary.event}</span>
          </div>
          <p className="text-sm font-semibold mb-1">{primary.headline}</p>
          <p className="text-xs opacity-80 leading-relaxed line-clamp-2">
            {primary.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs opacity-70">
            <span>🕐 {formatTime(primary.effective)} – {formatTime(primary.expires)}</span>
            {primary.web && (
              <a
                href={primary.web}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-100"
              >
                Infografis ↗
              </a>
            )}
          </div>
          {sorted.length > 1 && (
            <p className="text-xs opacity-60 mt-1">
              +{sorted.length - 1} peringatan lainnya
            </p>
          )}
          <p className="text-[10px] opacity-50 mt-1.5">Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-current opacity-50 hover:opacity-100 text-lg leading-none p-0.5"
          aria-label="Tutup peringatan"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
