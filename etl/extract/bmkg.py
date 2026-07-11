"""BMKG weather data provider — uses the public BMKG API (no API key).

API: https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_adm4}
Returns forecast data in 3-hour intervals; we pick the nearest/first entry.
"""

import logging
from datetime import UTC, datetime

import requests

from etl.extract._retry import retry_with_backoff
from etl.extract.models import NormalizedWeatherData
from etl.extract.provider import WeatherProvider

logger = logging.getLogger(__name__)

BMKG_API_URL = "https://api.bmkg.go.id/publik/prakiraan-cuaca"


class BMKGProvider(WeatherProvider):
    """Fetches weather forecast data from BMKG public API."""

    def fetch_current(
        self, adm4_code: str
    ) -> tuple[dict, NormalizedWeatherData]:
        """Fetch weather for an ADM4 code (e.g. "12.71.01.1001").

        Args:
            adm4_code: Full ADM4 code for a kelurahan in Medan.

        Returns:
            Tuple of (raw_api_response_as_dict, normalized_data).

        Raises:
            ConnectionError: If the API is unreachable after retries.
            ValueError: If the API returns unexpected data.
        """
        raw = retry_with_backoff(self._request, adm4_code)
        normalized = self._parse_response(raw, adm4_code)
        return raw, normalized

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
    def _parse_response(data: dict, adm4_code: str) -> NormalizedWeatherData:
        """Map BMKG API response to NormalizedWeatherData.

        Response shape:
        {
            "lokasi": { "kecamatan": "...", "desa": "...", ... },
            "data": [
                {
                    "lokasi": { ... },
                    "cuaca": [
                        [ { "t": 31, "hu": 63, "ws": 4.1, "wd": "SW",
                            "weather": 3, "weather_desc": "Berawan",
                            "tcc": 100, "tp": 0, "vs": 5994,
                            "local_datetime": "2026-07-11 10:00:00",
                            "datetime": "2026-07-11T03:00:00Z", ... },
                          ... ]   ← inner array = forecast intervals
                    ]
                }
            ]
        }

        We take the first forecast entry (nearest to current time).
        """
        # Navigate into the response
        data_list = data.get("data", [])
        if not data_list:
            raise ValueError(f"No forecast data in BMKG response for {adm4_code}")

        cuaca_groups = data_list[0].get("cuaca", [])
        if not cuaca_groups or not cuaca_groups[0]:
            raise ValueError(f"No cuaca entries in BMKG response for {adm4_code}")

        # First forecast entry (nearest to current)
        entry = cuaca_groups[0][0]

        # Parse observed_at from local_datetime (format: "2026-07-11 10:00:00")
        local_dt_str = entry.get("local_datetime", "")
        utc_dt_str = entry.get("datetime", "")
        if local_dt_str:
            observed_at = datetime.strptime(
                local_dt_str, "%Y-%m-%d %H:%M:%S"
            ).replace(tzinfo=UTC)
        elif utc_dt_str:
            observed_at = datetime.fromisoformat(
                utc_dt_str.replace("Z", "+00:00")
            )
        else:
            observed_at = datetime.now(UTC)

        return NormalizedWeatherData(
            observed_at=observed_at,
            temperature=_as_float(entry.get("t")),
            humidity=_as_float(entry.get("hu")),
            pressure=None,  # BMKG public API doesn't provide pressure
            wind_direction=entry.get("wd"),
            wind_speed=_as_float(entry.get("ws")),
            rainfall=_as_float(entry.get("tp")),
            uv_index=None,  # BMKG public API doesn't provide UV index
            visibility=_as_float(entry.get("vs", 0)) / 1000.0
            if entry.get("vs") is not None
            else None,  # meters → km
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
