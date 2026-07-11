"""Abstract base class for weather data providers."""

from abc import ABC, abstractmethod
from typing import Tuple

from etl.extract.models import NormalizedWeatherData


class WeatherProvider(ABC):
    """Interface that all weather providers must implement.

    Code outside etl/extract/ must only use this interface and
    NormalizedWeatherData — never provider-specific response shapes.
    """

    @abstractmethod
    def fetch_current(
        self, location: str
    ) -> Tuple[dict, NormalizedWeatherData]:
        """Fetch current weather for a location.

        Args:
            location: Location identifier (e.g. "Medan Amplas" or lat,lon).

        Returns:
            Tuple of (raw_api_response_as_dict, normalized_data).

        Raises:
            ConnectionError: If the API is unreachable after retries.
            ValueError: If the API returns unexpected data.
        """
