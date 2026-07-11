"""Unit tests for the Extract module."""

import json
import os
from datetime import datetime, timezone

import pytest

from etl.extract.mock import MockWeatherProvider
from etl.extract.models import NormalizedWeatherData


# ── MockWeatherProvider ──────────────────────────────────────────────


class TestMockProvider:
    def test_returns_normalized_data(self):
        provider = MockWeatherProvider()
        raw, norm = provider.fetch_current("Medan Kota")

        assert isinstance(raw, dict)
        assert isinstance(norm, NormalizedWeatherData)

    def test_fields_are_populated(self):
        _, norm = MockWeatherProvider().fetch_current("Medan Amplas")

        assert norm.temperature is not None
        assert norm.humidity is not None
        assert norm.pressure is not None
        assert norm.wind_direction is not None
        assert norm.wind_speed is not None
        assert norm.condition_desc is not None
        assert norm.observed_at is not None

    def test_deterministic_by_location(self):
        """Same location always returns the same values."""
        _, a = MockWeatherProvider().fetch_current("Medan Barat")
        _, b = MockWeatherProvider().fetch_current("Medan Barat")
        assert a.temperature == b.temperature
        assert a.humidity == b.humidity

    def test_different_locations_differ(self):
        """Different locations get different values."""
        _, a = MockWeatherProvider().fetch_current("Medan Barat")
        _, b = MockWeatherProvider().fetch_current("Medan Belawan")
        # Not guaranteed to differ for all fields, but condition should
        # (hash-based, very high probability)
        # Use temperature as a proxy — these two locations hash differently
        assert a.temperature != b.temperature or a.humidity != b.humidity

    def test_raw_json_structure(self):
        raw, _ = MockWeatherProvider().fetch_current("Medan Johor")
        assert "data" in raw
        assert "temperature" in raw["data"]
        assert "weather" in raw["data"]


# ── BMKGProvider parsing ────────────────────────────────────────────


class TestBMKGParse:
    """Test BMKG response parsing without hitting the network."""

    SAMPLE_RESPONSE = {
        "data": {
            "temperature": {"value": 29.5, "unit": "C"},
            "humidity": {"value": 78},
            "pressure": {"value": 1012},
            "wind_direction": {"direction": "SW"},
            "wind_speed": 8.5,
            "rainfall": 0.0,
            "uv_index": 6.0,
            "visibility": 10.0,
            "cloud_coverage": 45.0,
            "weather": {"code": "02", "description": "Cerah Berawan"},
            "observation_time": "2024-01-15T10:00:00+07:00",
        }
    }

    def test_parse_all_fields(self):
        from etl.extract.bmkg import BMKGProvider

        norm = BMKGProvider._parse_response(self.SAMPLE_RESPONSE, "Medan Kota")

        assert norm.temperature == 29.5
        assert norm.humidity == 78.0
        assert norm.pressure == 1012.0
        assert norm.wind_direction == "SW"
        assert norm.wind_speed == 8.5
        assert norm.rainfall == 0.0
        assert norm.uv_index == 6.0
        assert norm.visibility == 10.0
        assert norm.cloud_coverage == 45.0
        assert norm.condition_code == "02"
        assert norm.condition_desc == "Cerah Berawan"

    def test_parse_handles_missing_fields(self):
        from etl.extract.bmkg import BMKGProvider

        minimal = {
            "data": {
                "observation_time": "2024-01-15T10:00:00+07:00",
            }
        }
        norm = BMKGProvider._parse_response(minimal, "Test")

        assert norm.temperature is None
        assert norm.humidity is None
        assert norm.observed_at is not None

    def test_parse_flat_structure(self):
        """BMKG sometimes returns flat (no nested 'data' key)."""
        from etl.extract.bmkg import BMKGProvider

        flat = {
            "temperature": 27.0,
            "humidity": 80,
            "observation_time": "2024-01-15T10:00:00+07:00",
        }
        norm = BMKGProvider._parse_response(flat, "Test")
        assert norm.temperature == 27.0


# ── OpenWeatherProvider parsing ──────────────────────────────────────


class TestOpenWeatherParse:
    """Test OWM response parsing without hitting the network."""

    SAMPLE_RESPONSE = {
        "dt": 1705290000,
        "main": {
            "temp": 30.2,
            "humidity": 72,
            "pressure": 1010,
        },
        "wind": {"speed": 3.5, "deg": 225},
        "weather": [{"id": 802, "description": "scattered clouds"}],
        "clouds": {"all": 40},
        "visibility": 10000,
        "rain": {"1h": 0.5},
    }

    def test_parse_all_fields(self):
        from etl.extract.openweather import OpenWeatherProvider

        norm = OpenWeatherProvider._parse_response(self.SAMPLE_RESPONSE)

        assert norm.temperature == 30.2
        assert norm.humidity == 72
        assert norm.pressure == 1010
        assert norm.wind_direction == "SW"  # 225°
        assert norm.wind_speed == 3.5
        assert norm.visibility == 10.0  # 10000m → 10km
        assert norm.cloud_coverage == 40
        assert norm.condition_code == "802"
        assert norm.condition_desc == "scattered clouds"

    def test_parse_minimal(self):
        from etl.extract.openweather import OpenWeatherProvider

        minimal = {"dt": 1705290000}
        norm = OpenWeatherProvider._parse_response(minimal)
        assert norm.observed_at.year == 2024

    def test_deg_to_compass(self):
        from etl.extract.openweather import _deg_to_compass

        assert _deg_to_compass(0) == "N"
        assert _deg_to_compass(90) == "E"
        assert _deg_to_compass(180) == "S"
        assert _deg_to_compass(270) == "W"
        assert _deg_to_compass(45) == "NE"


# ── Config ───────────────────────────────────────────────────────────


class TestConfig:
    def test_default_to_mock(self, monkeypatch):
        monkeypatch.delenv("WEATHER_PROVIDER", raising=False)
        from etl.extract.config import get_provider

        provider = get_provider()
        assert isinstance(provider, MockWeatherProvider)

    def test_explicit_mock(self, monkeypatch):
        monkeypatch.setenv("WEATHER_PROVIDER", "mock")
        from etl.extract.config import get_provider

        provider = get_provider()
        assert isinstance(provider, MockWeatherProvider)

    def test_bmkg_missing_url_falls_back(self, monkeypatch):
        monkeypatch.setenv("WEATHER_PROVIDER", "bmkg")
        monkeypatch.delenv("BMKG_API_BASE_URL", raising=False)
        from etl.extract.config import get_provider

        provider = get_provider()
        assert isinstance(provider, MockWeatherProvider)

    def test_openweather_missing_key_falls_back(self, monkeypatch):
        monkeypatch.setenv("WEATHER_PROVIDER", "openweather")
        monkeypatch.delenv("OPENWEATHER_API_KEY", raising=False)
        from etl.extract.config import get_provider

        provider = get_provider()
        assert isinstance(provider, MockWeatherProvider)

    def test_unknown_provider_raises(self, monkeypatch):
        monkeypatch.setenv("WEATHER_PROVIDER", "foobar")
        from etl.extract.config import get_provider

        with pytest.raises(ValueError, match="Unknown WEATHER_PROVIDER"):
            get_provider()
