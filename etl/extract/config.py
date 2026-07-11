"""Provider configuration — reads WEATHER_PROVIDER from environment."""

import logging
import os

from etl.extract.provider import WeatherProvider

logger = logging.getLogger(__name__)


def get_provider() -> WeatherProvider:
    """Return a WeatherProvider instance based on WEATHER_PROVIDER env var.

    Supported values: "bmkg", "openweather", "mock" (default).
    Raises ValueError for unknown provider names.
    """
    name = os.environ.get("WEATHER_PROVIDER", "mock").strip().lower()

    if name == "mock":
        from etl.extract.mock import MockWeatherProvider

        logger.info("Using MockWeatherProvider")
        return MockWeatherProvider()

    if name == "bmkg":
        from etl.extract.bmkg import BMKGProvider

        base_url = os.environ.get("BMKG_API_BASE_URL", "")
        if not base_url:
            logger.warning(
                "BMKG_API_BASE_URL not set — falling back to MockWeatherProvider"
            )
            from etl.extract.mock import MockWeatherProvider

            return MockWeatherProvider()
        api_key = os.environ.get("BMKG_API_KEY", "")
        logger.info("Using BMKGProvider (base_url=%s)", base_url)
        return BMKGProvider(base_url=base_url, api_key=api_key)

    if name == "openweather":
        from etl.extract.openweather import OpenWeatherProvider

        api_key = os.environ.get("OPENWEATHER_API_KEY", "")
        if not api_key:
            logger.warning(
                "OPENWEATHER_API_KEY not set — falling back to MockWeatherProvider"
            )
            from etl.extract.mock import MockWeatherProvider

            return MockWeatherProvider()
        logger.info("Using OpenWeatherProvider")
        return OpenWeatherProvider(api_key=api_key)

    raise ValueError(
        f"Unknown WEATHER_PROVIDER={name!r}. "
        f"Supported: bmkg, openweather, mock"
    )
