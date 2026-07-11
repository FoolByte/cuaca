"""Shared fixtures for ETL tests."""

import pytest


@pytest.fixture
def sample_weather_data() -> dict:
    """Sample weather observation data for testing."""
    return {
        "temperature": 28.5,
        "humidity": 75.0,
        "pressure": 1013.25,
        "wind_direction": "NE",
        "wind_speed": 12.3,
        "rainfall": 0.0,
        "uv_index": 7.0,
        "visibility": 10.0,
        "cloud_coverage": 40.0,
        "condition_desc": "Partly Cloudy",
        "observation_time": "2024-01-15T10:00:00+07:00",
    }
