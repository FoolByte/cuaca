"""Persist raw weather observations to the staging table."""

import json
import logging
import os
from datetime import datetime

import psycopg2

logger = logging.getLogger(__name__)


def save_raw_observation(
    source: str,
    raw_json: dict,
    observed_at: datetime,
    dsn: str | None = None,
) -> int:
    """Insert a raw weather observation into raw_weather_observations.

    Args:
        source: Provider name (e.g. "BMKG", "OpenWeather", "Mock").
        raw_json: The raw API response as a dict.
        observed_at: Timestamp of the observation.
        dsn: PostgreSQL connection string. Falls back to DATABASE_URL env var.

    Returns:
        The raw_id of the inserted row.
    """
    conn = psycopg2.connect(dsn or os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO raw_weather_observations (source, raw_json, observed_at)
                VALUES (%s, %s, %s)
                RETURNING raw_id
                """,
                (source, json.dumps(raw_json), observed_at),
            )
            raw_id = cur.fetchone()[0]
        conn.commit()
        logger.info("Saved raw observation %d (source=%s)", raw_id, source)
        return raw_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
