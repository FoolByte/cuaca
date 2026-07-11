"""CLI entry point: transform raw weather observations.

Reads from raw_weather_observations, applies the transform pipeline,
returns a clean DataFrame for the load phase.

Usage:
    cd etl && python -m transform.run
"""

import logging
import os
import sys

import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()

from etl.transform.pipeline import (  # noqa: E402
    add_features,
    classify,
    clean,
    compute_trends,
    detect_anomalies,
    predict,
    standardize,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("etl.transform.run")


def read_raw_observations(dsn: str | None = None) -> pd.DataFrame:
    """Read raw observations from staging table into a DataFrame."""
    conn = psycopg2.connect(dsn or os.environ["DATABASE_URL"])
    try:
        df = pd.read_sql(
            """
            SELECT raw_id, source, raw_json, observed_at
            FROM raw_weather_observations
            ORDER BY observed_at
            """,
            conn,
        )
    finally:
        conn.close()
    return df


def parse_raw_json(df: pd.DataFrame) -> pd.DataFrame:
    """Parse raw_json column into normalized columns."""
    import json

    rows = []
    for _, row in df.iterrows():
        raw = row["raw_json"]
        if isinstance(raw, str):
            raw = json.loads(raw)

        source = row["source"]

        # Extract data from provider-specific raw JSON
        data = raw.get("data", raw)
        if isinstance(data, list):
            # BMKG format: data is a list of forecast groups
            if data and isinstance(data[0], dict):
                loc = data[0].get("lokasi", {})
                cuaca_groups = data[0].get("cuaca", [])
                if cuaca_groups and cuaca_groups[0]:
                    entry = cuaca_groups[0][0]  # nearest forecast
                else:
                    continue
                location_name = loc.get("kecamatan", "Unknown")
            else:
                continue
        elif isinstance(data, dict):
            # Mock format: data is a dict with nested data
            inner = data.get("data", data)
            if isinstance(inner, dict):
                entry = inner
                location_name = raw.get("location", data.get("location", "Unknown"))
            else:
                continue
        else:
            continue

        rows.append(
            {
                "observed_at": row["observed_at"],
                "location": location_name,
                "source": source,
                "temperature": entry.get("t", entry.get("temperature")),
                "humidity": entry.get("hu", entry.get("humidity")),
                "pressure": entry.get("pressure"),
                "wind_direction": entry.get("wd", entry.get("wind_direction")),
                "wind_speed": entry.get("ws", entry.get("wind_speed")),
                "rainfall": entry.get("tp", entry.get("rainfall")),
                "uv_index": entry.get("uv_index"),
                "visibility": _parse_visibility(entry),
                "cloud_coverage": entry.get("tcc", entry.get("cloud_coverage")),
                "condition_code": _extract_weather_field(entry, "code"),
                "condition_desc": _extract_weather_field(entry, "description"),
            }
        )

    return pd.DataFrame(rows)


def _parse_visibility(entry: dict) -> float | None:
    """Parse visibility — BMKG returns meters, Mock returns km."""
    vs = entry.get("vs")
    if vs is not None:
        return float(vs) / 1000.0  # meters → km
    return entry.get("visibility")


def _extract_weather_field(entry: dict, field: str) -> str | None:
    """Extract a field from the nested weather dict or flat keys.

    Handles both formats:
      - {"weather": {"code": "BC01", "description": "Cerah"}}
      - {"condition_code": "BC01", "condition_desc": "Cerah"}
    """
    weather = entry.get("weather")
    if isinstance(weather, dict):
        return weather.get(field)
    # Flat key fallback
    flat_key = f"condition_{field}" if field == "code" else f"weather_{field}"
    val = entry.get(flat_key, entry.get(field))
    return str(val) if val is not None else None


def run_transform(dsn: str | None = None) -> pd.DataFrame:
    """Execute the full transform pipeline.

    Returns transformed DataFrame ready for the load phase.
    """
    logger.info("Reading raw observations...")
    raw_df = read_raw_observations(dsn)
    if raw_df.empty:
        logger.warning("No raw observations found — nothing to transform")
        return pd.DataFrame()

    logger.info("Parsing raw JSON (%d rows)...", len(raw_df))
    parsed = parse_raw_json(raw_df)

    logger.info("Cleaning...")
    cleaned = clean(parsed)

    logger.info("Standardizing...")
    standardized = standardize(cleaned)

    logger.info("Adding features...")
    with_features = add_features(standardized)

    logger.info("Classifying...")
    classified = classify(with_features)

    logger.info("Computing trends...")
    with_trends = compute_trends(classified)

    logger.info("Detecting anomalies...")
    with_anomalies = detect_anomalies(with_trends)

    logger.info("Predicting...")
    final = predict(with_anomalies)

    anomaly_count = final["is_anomaly"].sum() if "is_anomaly" in final.columns else 0
    logger.info(
        "Transform complete — %d rows, %d anomalies detected",
        len(final),
        anomaly_count,
    )
    return final


def main() -> None:
    result = run_transform()
    if result.empty:
        logger.info("No data to transform")
        sys.exit(0)
    # For Phase 3, just log the result summary
    logger.info("Transformed columns: %s", list(result.columns))
    logger.info("Sample (first 3 rows):")
    for _, row in result.head(3).iterrows():
        logger.info(
            "  %s | %s: %.1f°C (%s) | anomaly=%s",
            row.get("observed_at"),
            row.get("location"),
            row.get("temperature", 0),
            row.get("temp_class", "?"),
            row.get("is_anomaly", False),
        )


if __name__ == "__main__":
    main()
