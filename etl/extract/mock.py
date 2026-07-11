"""Mock weather provider for development and testing.

Returns deterministic fake data based on location name — no network calls.
Each location gets slightly different values (seeded by hash) so heatmap
and analytics look realistic during development.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Tuple

from etl.extract.models import NormalizedWeatherData
from etl.extract.provider import WeatherProvider

logger = logging.getLogger(__name__)

_CONDITIONS = [
    ("BC01", "Cerah"),
    ("BC02", "Cerah Berawan"),
    ("BC03", "Berawan"),
    ("BC04", "Hujan Ringan"),
    ("BC05", "Hujan Sedang"),
    ("BC06", "Hujan Lebat"),
]


class MockWeatherProvider(WeatherProvider):
    """Returns realistic fake weather data — always succeeds."""

    def fetch_current(
        self, location: str
    ) -> Tuple[dict, NormalizedWeatherData]:
        seed = int(hashlib.md5(location.encode()).hexdigest(), 16)
        cond_idx = seed % len(_CONDITIONS)
        cond_code, cond_desc = _CONDITIONS[cond_idx]

        now = datetime.now(timezone.utc)
        raw = {
            "source": "mock",
            "location": location,
            "observation_time": now.isoformat(),
            "data": {
                "temperature": 26.0 + (seed % 80) / 10.0,
                "humidity": 60.0 + (seed % 40),
                "pressure": 1008.0 + (seed % 10),
                "wind_direction": ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
                    seed % 8
                ],
                "wind_speed": 5.0 + (seed % 20),
                "rainfall": 0.0 if cond_idx < 3 else (seed % 30) / 10.0,
                "uv_index": 3.0 + (seed % 8),
                "visibility": 5.0 + (seed % 10),
                "cloud_coverage": 20.0 + (seed % 60),
                "weather": {"code": cond_code, "description": cond_desc},
                "observation_time": now.isoformat(),
            },
        }

        d = raw["data"]
        normalized = NormalizedWeatherData(
            observed_at=now,
            temperature=d["temperature"],
            humidity=d["humidity"],
            pressure=d["pressure"],
            wind_direction=d["wind_direction"],
            wind_speed=d["wind_speed"],
            rainfall=d["rainfall"],
            uv_index=d["uv_index"],
            visibility=d["visibility"],
            cloud_coverage=d["cloud_coverage"],
            condition_code=cond_code,
            condition_desc=cond_desc,
        )

        logger.debug("Mock data for %s: %.1f°C, %s", location, d["temperature"], cond_desc)
        return raw, normalized
