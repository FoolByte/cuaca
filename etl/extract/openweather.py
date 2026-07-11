"""OpenWeatherMap weather data provider.

ponytail: Parsing is based on OpenWeatherMap API docs (One Call API 2.5).
Needs a real OPENWEATHER_API_KEY to validate against live responses.
Upgrade: adjust _parse_response() if using a different OWM endpoint.
"""

import logging
from datetime import datetime, timezone
from typing import Tuple

import requests

from etl.extract._retry import retry_with_backoff
from etl.extract.models import NormalizedWeatherData
from etl.extract.provider import WeatherProvider

logger = logging.getLogger(__name__)

# OWM weather condition codes → human-readable descriptions
_OWM_CONDITIONS: dict[int, str] = {
    200: "Thunderstorm with light rain",
    201: "Thunderstorm with rain",
    202: "Thunderstorm with heavy rain",
    300: "Light drizzle",
    301: "Drizzle",
    500: "Light rain",
    501: "Moderate rain",
    502: "Heavy rain",
    600: "Light snow",
    701: "Mist",
    721: "Haze",
    800: "Clear sky",
    801: "Few clouds",
    802: "Scattered clouds",
    803: "Broken clouds",
    804: "Overcast clouds",
}


class OpenWeatherProvider(WeatherProvider):
    """Fetches weather data from OpenWeatherMap API."""

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError(
                "OPENWEATHER_API_KEY is required for OpenWeatherProvider"
            )
        self.api_key = api_key

    def fetch_current(
        self, location: str
    ) -> Tuple[dict, NormalizedWeatherData]:
        raw = retry_with_backoff(self._request, location)
        normalized = self._parse_response(raw)
        return raw, normalized

    def _request(self, location: str) -> dict:
        resp = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": location, "appid": self.api_key, "units": "metric"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    @staticmethod
    def _parse_response(data: dict) -> NormalizedWeatherData:
        """Map OWM /data/2.5/weather response to NormalizedWeatherData."""
        main = data.get("main", {})
        wind = data.get("wind", {})
        weather = (data.get("weather") or [{}])[0]
        clouds = data.get("clouds", {})
        visibility_m = data.get("visibility")  # metres

        # Wind direction: OWM gives degrees, convert to compass
        wind_deg = wind.get("deg")

        return NormalizedWeatherData(
            observed_at=datetime.fromtimestamp(
                data.get("dt", 0), tz=timezone.utc
            ),
            temperature=main.get("temp"),
            humidity=main.get("humidity"),
            pressure=main.get("pressure"),
            wind_direction=_deg_to_compass(wind_deg) if wind_deg else None,
            wind_speed=wind.get("speed"),  # m/s by default in metric mode
            rainfall=(
                data.get("rain", {}).get("1h", 0.0)
                or data.get("rain", {}).get("3h", 0.0)
            ),
            uv_index=None,  # not in basic /weather endpoint
            visibility=visibility_m / 1000.0 if visibility_m else None,
            cloud_coverage=clouds.get("all"),
            condition_code=str(weather.get("id", "")) or None,
            condition_desc=weather.get("description")
            or _OWM_CONDITIONS.get(weather.get("id", 0)),
        )


def _deg_to_compass(deg: float) -> str:
    """Convert wind degrees to 16-point compass direction."""
    dirs = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
    ]
    idx = int((deg + 11.25) / 22.5) % 16
    return dirs[idx]
