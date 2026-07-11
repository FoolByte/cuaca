"""Provider configuration — reads WEATHER_PROVIDER from environment."""

import logging
import os

from etl.extract.provider import WeatherProvider

logger = logging.getLogger(__name__)


def get_provider() -> WeatherProvider:
    """Return a WeatherProvider instance based on WEATHER_PROVIDER env var.

    Supported values: "bmkg" (default, no key needed), "openweather", "mock".
    Raises ValueError for unknown provider names.
    """
    name = os.environ.get("WEATHER_PROVIDER", "bmkg").strip().lower()

    if name == "mock":
        from etl.extract.mock import MockWeatherProvider

        logger.info("Using MockWeatherProvider")
        return MockWeatherProvider()

    if name == "bmkg":
        from etl.extract.bmkg import BMKGProvider

        logger.info("Using BMKGProvider (public API)")
        return BMKGProvider()

    if name == "openweather":
        from etl.extract.openweather import OpenWeatherProvider

        api_key = os.environ.get("OPENWEATHER_API_KEY", "")
        if not api_key:
            logger.warning(
                "OPENWEATHER_API_KEY not set — falling back to BMKGProvider"
            )
            from etl.extract.bmkg import BMKGProvider

            return BMKGProvider()
        logger.info("Using OpenWeatherProvider")
        return OpenWeatherProvider(api_key=api_key)

    raise ValueError(
        f"Unknown WEATHER_PROVIDER={name!r}. "
        f"Supported: bmkg, openweather, mock"
    )
