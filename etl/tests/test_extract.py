"""Unit tests for the Extract module."""


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
        "lokasi": {
            "adm1": "12",
            "adm2": "12.71",
            "adm3": "12.71.01",
            "adm4": "12.71.01.1001",
            "provinsi": "Sumatera Utara",
            "kotkab": "Kota Medan",
            "kecamatan": "Medan Kota",
            "desa": "Kotamatsum III",
            "lon": 98.6847,
            "lat": 3.5839,
            "timezone": "Asia/Jakarta",
        },
        "data": [
            {
                "lokasi": {},
                "cuaca": [
                    [
                        {
                            "datetime": "2026-07-11T03:00:00Z",
                            "t": 31,
                            "tcc": 100,
                            "tp": 0,
                            "weather": 3,
                            "weather_desc": "Berawan",
                            "weather_desc_en": "Mostly Cloudy",
                            "wd_deg": 254,
                            "wd": "SW",
                            "wd_to": "NE",
                            "ws": 4.1,
                            "hu": 63,
                            "vs": 5994,
                            "vs_text": "< 6 km",
                            "local_datetime": "2026-07-11 10:00:00",
                            "image": "https://api-apps.bmkg.go.id/storage/icon/cuaca/berawan-am.svg",
                        },
                    ]
                ],
            }
        ],
    }

    def test_parse_all_fields(self):
        from etl.extract.bmkg import BMKGProvider

        norm = BMKGProvider._parse_response(self.SAMPLE_RESPONSE, "12.71.01.1001")

        assert norm.temperature == 31.0
        assert norm.humidity == 63.0
        assert norm.pressure is None  # BMKG doesn't provide pressure
        assert norm.wind_direction == "SW"
        assert norm.wind_speed == 4.1
        assert norm.rainfall == 0.0
        assert norm.uv_index is None  # BMKG doesn't provide UV
        assert norm.visibility == pytest.approx(5.994, abs=0.01)
        assert norm.cloud_coverage == 100.0
        assert norm.condition_code == "3"
        assert norm.condition_desc == "Berawan"

    def test_parse_empty_data_raises(self):
        from etl.extract.bmkg import BMKGProvider

        with pytest.raises(ValueError, match="No forecast data"):
            BMKGProvider._parse_response({"data": []}, "12.71.01.1001")


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
    def test_default_to_bmkg(self, monkeypatch):
        monkeypatch.delenv("WEATHER_PROVIDER", raising=False)
        from etl.extract.bmkg import BMKGProvider
        from etl.extract.config import get_provider

        provider = get_provider()
        assert isinstance(provider, BMKGProvider)

    def test_explicit_mock(self, monkeypatch):
        monkeypatch.setenv("WEATHER_PROVIDER", "mock")
        from etl.extract.config import get_provider

        provider = get_provider()
        assert isinstance(provider, MockWeatherProvider)

    def test_bmkg_uses_public_api(self, monkeypatch):
        monkeypatch.setenv("WEATHER_PROVIDER", "bmkg")
        from etl.extract.bmkg import BMKGProvider
        from etl.extract.config import get_provider

        provider = get_provider()
        assert isinstance(provider, BMKGProvider)

    def test_openweather_missing_key_falls_back_to_bmkg(self, monkeypatch):
        monkeypatch.setenv("WEATHER_PROVIDER", "openweather")
        monkeypatch.delenv("OPENWEATHER_API_KEY", raising=False)
        from etl.extract.bmkg import BMKGProvider
        from etl.extract.config import get_provider

        provider = get_provider()
        assert isinstance(provider, BMKGProvider)

    def test_unknown_provider_raises(self, monkeypatch):
        monkeypatch.setenv("WEATHER_PROVIDER", "foobar")
        from etl.extract.config import get_provider

        with pytest.raises(ValueError, match="Unknown WEATHER_PROVIDER"):
            get_provider()


# ── ADM4 constants ──────────────────────────────────────────────────


class TestMedanADM4:
    def test_all_kelurahan_count(self):
        from etl.extract.medan_adm4 import all_kelurahan_adm4

        codes = all_kelurahan_adm4()
        # 21 kecamatan, ~151 kelurahan total
        assert len(codes) == 151

    def test_adm4_format(self):
        from etl.extract.medan_adm4 import all_kelurahan_adm4

        codes = all_kelurahan_adm4()
        for code in codes:
            parts = code.split(".")
            assert len(parts) == 4
            assert parts[0] == "12"
            assert parts[1] == "71"

    def test_kecamatan_adm3_count(self):
        from etl.extract.medan_adm4 import kecamatan_adm3

        codes = kecamatan_adm3()
        assert len(codes) == 21
