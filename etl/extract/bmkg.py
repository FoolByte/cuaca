"""BMKG weather data provider — uses the public BMKG API (no API key).

API: https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_adm4}
Returns forecast data in 3-hour intervals over 3 days (24 entries per update).
BMKG updates 2x daily.
"""

import logging
import os
from datetime import UTC, datetime, timezone, timedelta

import requests

from etl.extract._retry import retry_with_backoff
from etl.extract.models import NormalizedWeatherData
from etl.extract.provider import WeatherProvider

logger = logging.getLogger(__name__)

BMKG_API_URL = os.environ.get(
    "BMKG_API_URL",
    "https://api.bmkg.go.id/publik/prakiraan-cuaca",
)


class BMKGProvider(WeatherProvider):
    """Fetches weather forecast data from BMKG public API."""

    def fetch_current(
        self, adm4_code: str
    ) -> tuple[dict, NormalizedWeatherData]:
        """Fetch nearest forecast for an ADM4 code.

        Kept for backward compatibility with WeatherProvider interface.
        """
        raw = retry_with_backoff(self._request, adm4_code, max_retries=5)
        entries = self._parse_all_entries(raw, adm4_code)
        if not entries:
            raise ValueError(f"No forecast data in BMKG response for {adm4_code}")
        return raw, entries[0]

    def fetch_all_forecasts(
        self, adm4_code: str
    ) -> tuple[dict, list[NormalizedWeatherData]]:
        """Fetch ALL forecast entries (3 days × 8 intervals = ~24 entries).

        Returns:
            Tuple of (raw_api_response, list_of_normalized_entries).
        """
        raw = retry_with_backoff(self._request, adm4_code, max_retries=5)
        entries = self._parse_all_entries(raw, adm4_code)
        return raw, entries

    @staticmethod
    def _request(adm4_code: str) -> dict:
        resp = requests.get(
            BMKG_API_URL,
            params={"adm4": adm4_code},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def _parse_all_entries(
        data: dict, adm4_code: str
    ) -> list[NormalizedWeatherData]:
        """Parse ALL forecast entries from BMKG response.

        BMKG returns cuaca as nested arrays:
            cuaca = [ [entry, entry, ...],   ← day 1 (8 entries)
                      [entry, entry, ...],   ← day 2
                      [entry, entry, ...] ]  ← day 3
        """
        data_list = data.get("data", [])
        if not data_list:
            return []

        cuaca_groups = data_list[0].get("cuaca", [])
        if not cuaca_groups:
            return []

        entries: list[NormalizedWeatherData] = []
        for group in cuaca_groups:
            for entry in group:
                normalized = _entry_to_normalized(entry)
                if normalized is not None:
                    entries.append(normalized)

        return entries


def _parse_dt(entry: dict) -> datetime:
    """Extract observed_at as naive UTC datetime from BMKG entry."""
    utc_str = entry.get("datetime", "")
    local_str = entry.get("local_datetime", "")

    if utc_str:
        dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
        return dt.replace(tzinfo=None)

    if local_str:
        WIB = timezone(timedelta(hours=7))
        dt = datetime.strptime(local_str, "%Y-%m-%d %H:%M:%S").replace(
            tzinfo=WIB
        )
        return dt.astimezone(UTC).replace(tzinfo=None)

    return datetime.now(UTC).replace(tzinfo=None)


def _entry_to_normalized(entry: dict) -> NormalizedWeatherData | None:
    """Convert a single BMKG forecast entry to NormalizedWeatherData."""
    utc_str = entry.get("datetime", "")
    local_str = entry.get("local_datetime", "")
    if not utc_str and not local_str:
        return None

    return NormalizedWeatherData(
        observed_at=_parse_dt(entry),
        temperature=_as_float(entry.get("t")),
        humidity=_as_float(entry.get("hu")),
        pressure=None,
        wind_direction=entry.get("wd"),
        wind_speed=_as_float(entry.get("ws")),
        rainfall=_as_float(entry.get("tp")),
        uv_index=None,
        visibility=_as_float(entry.get("vs", 0)) / 1000.0
        if entry.get("vs") is not None
        else None,
        cloud_coverage=_as_float(entry.get("tcc")),
        condition_code=str(entry.get("weather", "")) or None,
        condition_desc=entry.get("weather_desc"),
    )


def _as_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None
