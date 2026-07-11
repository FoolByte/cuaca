"""Normalized weather data model — the contract all providers return."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class NormalizedWeatherData:
    """Weather observation in a provider-agnostic format.

    All fields except observed_at are Optional because not every
    provider supplies every measurement.
    """

    observed_at: datetime
    temperature: Optional[float] = None  # °C
    humidity: Optional[float] = None  # %
    pressure: Optional[float] = None  # hPa
    wind_direction: Optional[str] = None  # e.g. "NE", "SW"
    wind_speed: Optional[float] = None  # km/h
    rainfall: Optional[float] = None  # mm
    uv_index: Optional[float] = None
    visibility: Optional[float] = None  # km
    cloud_coverage: Optional[float] = None  # %
    condition_code: Optional[str] = None  # provider-specific code
    condition_desc: Optional[str] = None  # human-readable description
