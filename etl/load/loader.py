"""Incremental loader — upsert dimensions, insert fact_weather, manage watermark.

All database operations run inside a single transaction (atomic).
No data is ever deleted from fact_weather.
"""

import logging
from datetime import datetime
from typing import Any

import pandas as pd
import psycopg2

logger = logging.getLogger(__name__)

# ── Watermark table DDL ─────────────────────────────────────────────

_WATERMARK_DDL = """
CREATE TABLE IF NOT EXISTS etl_watermark (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    last_loaded_at  TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

# ── Quality check thresholds ────────────────────────────────────────

REQUIRED_FACT_COLS = [
    "observed_at",
    "location",
    "temperature",
    "humidity",
    "wind_speed",
    "rainfall",
    "source",
]


def quality_check(df: pd.DataFrame) -> list[str]:
    """Validate transformed data before load.

    Returns list of issues found (empty = OK).
    """
    issues: list[str] = []

    if df.empty:
        issues.append("DataFrame is empty — nothing to load")
        return issues

    for col in REQUIRED_FACT_COLS:
        if col not in df.columns:
            issues.append(f"Missing required column: {col}")
            continue
        null_count = df[col].isna().sum()
        if null_count > 0:
            pct = null_count / len(df) * 100
            issues.append(
                f"Column '{col}' has {null_count} nulls ({pct:.1f}%)"
            )

    return issues


# ── Watermark helpers ───────────────────────────────────────────────


def ensure_watermark_table(cur: Any) -> None:
    """Create etl_watermark table if it doesn't exist."""
    cur.execute(_WATERMARK_DDL)


def get_watermark(cur: Any) -> datetime | None:
    """Return the last loaded timestamp, or None if no watermark exists."""
    cur.execute("SELECT last_loaded_at FROM etl_watermark WHERE id = 1")
    row = cur.fetchone()
    return row[0] if row else None


def set_watermark(cur: Any, ts: datetime) -> None:
    """Upsert the watermark timestamp."""
    cur.execute(
        """
        INSERT INTO etl_watermark (id, last_loaded_at, updated_at)
        VALUES (1, %s, NOW())
        ON CONFLICT (id) DO UPDATE
        SET last_loaded_at = EXCLUDED.last_loaded_at,
            updated_at = NOW()
        """,
        (ts,),
    )


# ── Dimension upserts ──────────────────────────────────────────────


def upsert_dim_time(cur: Any, timestamps: list[datetime]) -> dict[datetime, int]:
    """Upsert dim_time rows and return {timestamp: time_id} mapping."""
    mapping: dict[datetime, int] = {}
    if not timestamps:
        return mapping

    for ts in timestamps:
        cur.execute(
            """
            INSERT INTO dim_time (
                timestamp, date, hour, day, month, year,
                day_of_week, is_weekend
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (timestamp) DO NOTHING
            RETURNING time_id
            """,
            (
                ts,
                ts.date(),
                ts.hour,
                ts.day,
                ts.month,
                ts.year,
                ts.weekday(),  # 0=Monday in Python, but SQL uses 0=Sunday
                ts.weekday() >= 5,
            ),
        )
        row = cur.fetchone()
        if row:
            mapping[ts] = row[0]
        else:
            # Already exists — fetch existing time_id
            cur.execute(
                "SELECT time_id FROM dim_time WHERE timestamp = %s",
                (ts,),
            )
            mapping[ts] = cur.fetchone()[0]

    logger.info("dim_time: %d timestamps processed", len(mapping))
    return mapping


def upsert_dim_location(
    cur: Any,
    locations: list[str],
    coord_map: dict[str, tuple[float | None, float | None]] | None = None,
) -> dict[str, int]:
    """Upsert dim_location rows (city='Medan') and return {district: location_id}."""
    mapping: dict[str, int] = {}
    if not locations:
        return mapping

    for district in locations:
        lat, lon = (coord_map or {}).get(district, (None, None))
        cur.execute(
            """
            INSERT INTO dim_location (city, district, latitude, longitude, region_level)
            VALUES ('Medan', %s, %s, %s, 'kecamatan')
            ON CONFLICT (city, district) DO UPDATE
            SET latitude = COALESCE(EXCLUDED.latitude, dim_location.latitude),
                longitude = COALESCE(EXCLUDED.longitude, dim_location.longitude)
            RETURNING location_id
            """,
            (district, lat, lon),
        )
        row = cur.fetchone()
        if row:
            mapping[district] = row[0]
        else:
            cur.execute(
                """SELECT location_id FROM dim_location
                   WHERE city = 'Medan' AND district = %s""",
                (district,),
            )
            mapping[district] = cur.fetchone()[0]

    logger.info("dim_location: %d locations processed", len(mapping))
    return mapping


def upsert_dim_weather(
    cur: Any, df: pd.DataFrame
) -> dict[tuple, int]:
    """Insert new dim_weather rows and return mapping to weather_id.

    Uses in-memory dedup to avoid inserting duplicate classification combos.
    """
    # Load existing dim_weather into memory
    cur.execute(
        """SELECT weather_id, condition_code, condition_desc,
                  temp_classification, humidity_classification,
                  wind_classification, rain_classification
           FROM dim_weather"""
    )
    existing: dict[tuple, int] = {}
    for row in cur.fetchall():
        key = (row[1], row[2], row[3], row[4], row[5], row[6])
        existing[key] = row[0]

    # Find new classification combos in the data
    classification_cols = [
        "condition_code",
        "condition_desc",
        "temp_class",
        "humidity_class",
        "wind_class",
        "rainfall_class",
    ]

    # Ensure all classification columns exist
    for col in classification_cols:
        if col not in df.columns:
            df[col] = None

    combos = df[classification_cols].drop_duplicates()

    new_count = 0
    for _, combo in combos.iterrows():
        key = tuple(combo[col] for col in classification_cols)
        if key not in existing:
            cur.execute(
                """
                INSERT INTO dim_weather
                    (condition_code, condition_desc,
                     temp_classification, humidity_classification,
                     wind_classification, rain_classification)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING weather_id
                """,
                key,
            )
            existing[key] = cur.fetchone()[0]
            new_count += 1

    logger.info(
        "dim_weather: %d existing, %d new inserted",
        len(existing) - new_count,
        new_count,
    )
    return existing


# ── Fact insert ─────────────────────────────────────────────────────


def insert_fact_weather(
    cur: Any,
    df: pd.DataFrame,
    time_map: dict[datetime, int],
    location_map: dict[str, int],
    weather_map: dict[tuple, int],
) -> dict[str, int]:
    """Insert fact_weather rows with dedup on (time_id, location_id).

    Returns {"inserted": N, "skipped": N}.
    """
    classification_cols = [
        "condition_code",
        "condition_desc",
        "temp_class",
        "humidity_class",
        "wind_class",
        "rainfall_class",
    ]

    inserted = 0
    skipped = 0

    for _, row in df.iterrows():
        ts = row["observed_at"]
        district = row["location"]

        time_id = time_map.get(ts)
        location_id = location_map.get(district)
        if time_id is None or location_id is None:
            skipped += 1
            continue

        weather_key = tuple(row.get(c) for c in classification_cols)
        weather_id = weather_map.get(weather_key)
        if weather_id is None:
            skipped += 1
            continue

        try:
            cur.execute(
                """
                INSERT INTO fact_weather
                    (time_id, location_id, weather_id,
                     temperature, humidity, pressure, wind_direction,
                     wind_speed, rainfall, uv_index, visibility,
                     cloud_coverage, temp_avg, temp_max, temp_min, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (time_id, location_id) DO UPDATE SET
                    weather_id = EXCLUDED.weather_id,
                    temperature = EXCLUDED.temperature,
                    humidity = EXCLUDED.humidity,
                    pressure = EXCLUDED.pressure,
                    wind_direction = EXCLUDED.wind_direction,
                    wind_speed = EXCLUDED.wind_speed,
                    rainfall = EXCLUDED.rainfall,
                    uv_index = EXCLUDED.uv_index,
                    visibility = EXCLUDED.visibility,
                    cloud_coverage = EXCLUDED.cloud_coverage,
                    temp_avg = EXCLUDED.temp_avg,
                    temp_max = EXCLUDED.temp_max,
                    temp_min = EXCLUDED.temp_min,
                    source = EXCLUDED.source
                """,
                (
                    time_id,
                    location_id,
                    weather_id,
                    _safe_num(row, "temperature"),
                    _safe_num(row, "humidity"),
                    _safe_num(row, "pressure"),
                    row.get("wind_direction"),
                    _safe_num(row, "wind_speed"),
                    _safe_num(row, "rainfall"),
                    _safe_num(row, "uv_index"),
                    _safe_num(row, "visibility"),
                    _safe_num(row, "cloud_coverage"),
                    _safe_num(row, "temp_avg"),
                    _safe_num(row, "temp_max"),
                    _safe_num(row, "temp_min"),
                    row.get("source"),
                ),
            )
            if cur.rowcount > 0:
                inserted += 1
            else:
                skipped += 1
        except Exception:
            skipped += 1
            logger.debug("Skipped row (time_id=%d, loc_id=%d)", time_id, location_id)

    logger.info("fact_weather: %d inserted, %d skipped", inserted, skipped)
    return {"inserted": inserted, "skipped": skipped}


def _safe_num(row: pd.Series, col: str) -> float | None:
    """Extract a numeric value, returning None for NaN."""
    val = row.get(col)
    if val is None or pd.isna(val):
        return None
    return float(val)


# ── Main load function ─────────────────────────────────────────────


def load(
    df: pd.DataFrame,
    dsn: str,
    skip_quality: bool = False,
) -> dict[str, int]:
    """Execute the full load pipeline inside a single atomic transaction.

    Args:
        df: Transformed DataFrame from the transform pipeline.
        dsn: PostgreSQL connection string.
        skip_quality: If True, skip data quality checks (for testing).

    Returns:
        {"inserted": N, "skipped": N, "quality_issues": N}

    Raises:
        ValueError: If quality checks fail (unless skip_quality=True).
        psycopg2.Error: If database operations fail (entire transaction rolls back).
    """
    if not skip_quality:
        issues = quality_check(df)
        if issues:
            for issue in issues:
                logger.warning("Quality issue: %s", issue)
            if any("empty" in i.lower() or "missing" in i.lower() for i in issues):
                raise ValueError(f"Quality check failed: {issues}")

    conn = psycopg2.connect(dsn)
    try:
        conn.autocommit = False
        cur = conn.cursor()
        # Ensure UTC session timezone so TIMESTAMP WITHOUT TIME ZONE stores UTC
        cur.execute("SET timezone = 'UTC'")

        # 1. Ensure watermark table exists
        ensure_watermark_table(cur)

        # 2. Check watermark — filter to new data only
        watermark = get_watermark(cur)
        if watermark is not None:
            from datetime import timezone

            if watermark.tzinfo is None:
                watermark = watermark.replace(tzinfo=timezone.utc)
            before = len(df)
            df = df[df["observed_at"] > watermark]
            logger.info(
                "Watermark filter: %s — %d → %d rows",
                watermark,
                before,
                len(df),
            )
            if df.empty:
                logger.info("No new data since watermark — nothing to load")
                conn.commit()
                return {"inserted": 0, "skipped": 0, "quality_issues": 0}

        # 3. Upsert dimensions
        timestamps = df["observed_at"].unique().tolist()
        locations = df["location"].unique().tolist()

        # Build coord_map: {location: (lat, lon)} if columns exist
        coord_map: dict[str, tuple[float | None, float | None]] = {}
        if "latitude" in df.columns and "longitude" in df.columns:
            for _, r in df[["location", "latitude", "longitude"]].drop_duplicates("location").iterrows():
                coord_map[r["location"]] = (r["latitude"], r["longitude"])

        time_map = upsert_dim_time(cur, timestamps)
        location_map = upsert_dim_location(cur, locations, coord_map)
        weather_map = upsert_dim_weather(cur, df)

        # 4. Insert fact rows
        result = insert_fact_weather(cur, df, time_map, location_map, weather_map)

        # 5. Update watermark to max observed_at
        max_ts = df["observed_at"].max()
        set_watermark(cur, max_ts)
        logger.info("Watermark updated to %s", max_ts)

        conn.commit()
        logger.info("Load committed — %s", result)
        return {**result, "quality_issues": 0}

    except Exception:
        conn.rollback()
        logger.exception("Load failed — transaction rolled back")
        raise
    finally:
        conn.close()
