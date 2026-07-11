"""Abstract base class for weather data providers."""

from abc import ABC, abstractmethod

from etl.extract.models import NormalizedWeatherData


class WeatherProvider(ABC):
    """Interface that all weather providers must implement.

    Code outside etl/extract/ must only use this interface and
    NormalizedWeatherData — never provider-specific response shapes.
    """

    @abstractmethod
    def fetch_current(
        self, location: str
    ) -> tuple[dict, NormalizedWeatherData]:
        """Fetch current weather for a location.

        Args:
            location: Location identifier — ADM4 code for BMKG
                      (e.g. "12.71.01.1001"), kecamatan name for Mock.

        Returns:
            Tuple of (raw_api_response_as_dict, normalized_data).

        Raises:
            ConnectionError: If the API is unreachable after retries.
            ValueError: If the API returns unexpected data.
        """
