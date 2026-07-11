"""BMKG weather data provider.

ponytail: Parsing is based on BMKG public API documentation structure.
Needs a real API key/response to validate field mapping once available.
Upgrade: plug in real BMKG_API_BASE_URL and adjust _parse_response().
"""

import logging
from datetime import datetime, timezone
from typing import Tuple

import requests

from etl.extract._retry import retry_with_backoff
from etl.extract.models import NormalizedWeatherData
from etl.extract.provider import WeatherProvider

logger = logging.getLogger(__name__)


class BMKGProvider(WeatherProvider):
    """Fetches weather data from BMKG (Badan Meteorologi Indonesia) API."""

    def __init__(self, base_url: str, api_key: str = "") -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def fetch_current(
        self, location: str
    ) -> Tuple[dict, NormalizedWeatherData]:
        raw = retry_with_backoff(self._request, location)
        normalized = self._parse_response(raw, location)
        return raw, normalized

    def _request(self, location: str) -> dict:
        url = f"{self.base_url}/weather/current"
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        resp = requests.get(
            url,
            params={"location": location},
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def _parse_response(data: dict, location: str) -> NormalizedWeatherData:
        """Map BMKG response fields to NormalizedWeatherData.

        Assumes BMKG returns a structure like:
        {
            "data": {
                "temperature": {"value": 28.5, "unit": "C"},
                "humidity": {"value": 75},
                ...
                "weather": {"code": "0", "description": "Cerah"},
                "observation_time": "2024-01-15T10:00:00+07:00"
            }
        }
        """
        d = data.get("data", data)
        weather = d.get("weather", {})
        return NormalizedWeatherData(
            observed_at=datetime.fromisoformat(
                d.get("observation_time", d.get("local_datetime", ""))
            ).astimezone(timezone.utc),
            temperature=_safe_float(d, "temperature"),
            humidity=_safe_float(d, "humidity"),
            pressure=_safe_float(d, "pressure"),
            wind_direction=d.get("wind_direction", {}).get("direction")
            if isinstance(d.get("wind_direction"), dict)
            else d.get("wind_direction"),
            wind_speed=_safe_float(d, "wind_speed"),
            rainfall=_safe_float(d, "rainfall"),
            uv_index=_safe_float(d, "uv_index"),
            visibility=_safe_float(d, "visibility"),
            cloud_coverage=_safe_float(d, "cloud_coverage"),
            condition_code=str(weather.get("code", "")) or None,
            condition_desc=weather.get("description"),
        )


def _safe_float(d: dict, key: str) -> float | None:
    """Extract a numeric value, handling nested {'value': N} dicts."""
    val = d.get(key)
    if val is None:
        return None
    if isinstance(val, dict):
        val = val.get("value")
    try:
        return float(val)
    except (TypeError, ValueError):
        return None
