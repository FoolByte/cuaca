"""Unit tests for the Transform module.

Tests cover: cleaning, standardization, feature engineering,
classification, trend analysis, anomaly detection, prediction.
All functions are tested with normal data, edge cases, and empty DataFrames.
"""

from datetime import UTC

import numpy as np
import pandas as pd
import pytest

from etl.transform import config as cfg
from etl.transform.pipeline import (
    add_features,
    classify,
    classify_humidity,
    classify_rainfall,
    classify_temperature,
    classify_wind,
    clean,
    compute_trends,
    detect_anomalies,
    predict,
    standardize,
)

# ── Helpers ────────────────────────────────────────────────────────


def _make_df(
    n: int = 5,
    location: str = "Medan Kota",
    base_temp: float = 28.0,
    base_humidity: float = 70.0,
) -> pd.DataFrame:
    """Create a sample DataFrame with n rows."""
    from datetime import datetime, timedelta

    now = datetime(2024, 1, 15, 10, 0, 0, tzinfo=UTC)
    _dirs = ["NE", "SW", "E", "N", "W"]
    _codes = ["01", "02", "03", "60", "95"]
    _descs = ["Cerah", "Cerah Berawan", "Berawan", "Hujan Sedang", "Hujan Lebat"]
    _rains = [0.0, 0.0, 2.5, 10.0, 25.0]
    return pd.DataFrame(
        {
            "observed_at": [now + timedelta(hours=i * 3) for i in range(n)],
            "location": [location] * n,
            "source": ["Mock"] * n,
            "temperature": [base_temp + i for i in range(n)],
            "humidity": [base_humidity - i * 2 for i in range(n)],
            "pressure": [1010.0 + i for i in range(n)],
            "wind_direction": [_dirs[i % len(_dirs)] for i in range(n)],
            "wind_speed": [5.0 + i * 3 for i in range(n)],
            "rainfall": [_rains[i % len(_rains)] for i in range(n)],
            "uv_index": [5.0 + i for i in range(n)],
            "visibility": [10.0 - i for i in range(n)],
            "cloud_coverage": [40.0 + i * 10 for i in range(n)],
            "condition_code": [_codes[i % len(_codes)] for i in range(n)],
            "condition_desc": [_descs[i % len(_descs)] for i in range(n)],
        }
    )


# ── Cleaning ───────────────────────────────────────────────────────


class TestClean:
    def test_removes_duplicates(self):
        df = _make_df(3)
        df = pd.concat([df, df.iloc[[0]]], ignore_index=True)
        result = clean(df)
        assert len(result) == 3

    def test_drops_missing_observed_at(self):
        df = _make_df(3)
        df.loc[1, "observed_at"] = None
        result = clean(df)
        assert len(result) == 2

    def test_drops_missing_location(self):
        df = _make_df(3)
        df.loc[0, "location"] = None
        result = clean(df)
        assert len(result) == 2

    def test_clamps_invalid_humidity(self):
        df = _make_df(2)
        df.loc[0, "humidity"] = 150.0  # above 100
        df.loc[1, "humidity"] = -10.0  # below 0
        result = clean(df)
        assert pd.isna(result.loc[0, "humidity"])
        assert pd.isna(result.loc[1, "humidity"])

    def test_clamps_extreme_temperature(self):
        df = _make_df(2)
        df.loc[0, "temperature"] = 100.0  # above 60
        df.loc[1, "temperature"] = -100.0  # below -90
        result = clean(df)
        assert pd.isna(result.loc[0, "temperature"])
        assert pd.isna(result.loc[1, "temperature"])

    def test_valid_values_not_clamped(self):
        df = _make_df(2)
        result = clean(df)
        assert result.loc[0, "temperature"] == 28.0
        assert result.loc[0, "humidity"] == 70.0

    def test_empty_df(self):
        df = pd.DataFrame()
        result = clean(df)
        assert len(result) == 0


# ── Standardization ────────────────────────────────────────────────


class TestStandardize:
    def test_utc_aware(self):
        df = _make_df(2)
        result = standardize(df)
        assert result["observed_at"].dt.tz is not None

    def test_trim_whitespace(self):
        df = _make_df(2)
        df.loc[0, "location"] = "  Medan Kota  "
        df.loc[0, "wind_direction"] = "  ne  "
        result = standardize(df)
        assert result.loc[0, "location"] == "Medan Kota"
        assert result.loc[0, "wind_direction"] == "NE"

    def test_empty_strings_to_none(self):
        df = _make_df(2)
        df.loc[0, "condition_desc"] = ""
        result = standardize(df)
        assert result.loc[0, "condition_desc"] is None

    def test_wind_direction_uppercase(self):
        df = _make_df(2)
        df["wind_direction"] = ["sw", "ne"]
        result = standardize(df)
        assert result.loc[0, "wind_direction"] == "SW"
        assert result.loc[1, "wind_direction"] == "NE"

    def test_empty_df(self):
        df = pd.DataFrame()
        result = standardize(df)
        assert len(result) == 0


# ── Feature engineering ────────────────────────────────────────────


class TestAddFeatures:
    def test_adds_aggregate_columns(self):
        df = _make_df(5)
        result = add_features(df)
        assert "temp_avg" in result.columns
        assert "temp_max" in result.columns
        assert "temp_min" in result.columns
        assert "humidity_avg" in result.columns
        assert "pressure_avg" in result.columns

    def test_aggregates_per_location(self):
        df = pd.concat(
            [
                _make_df(3, location="A", base_temp=20),
                _make_df(3, location="B", base_temp=30),
            ],
            ignore_index=True,
        )
        result = add_features(df)
        a_rows = result[result["location"] == "A"]
        b_rows = result[result["location"] == "B"]
        assert a_rows["temp_avg"].iloc[0] == pytest.approx(21.0)  # (20+21+22)/3
        assert b_rows["temp_avg"].iloc[0] == pytest.approx(31.0)  # (30+31+32)/3

    def test_empty_df(self):
        df = pd.DataFrame()
        result = add_features(df)
        assert "temp_avg" in result.columns


# ── Classification ─────────────────────────────────────────────────


class TestClassify:
    def test_temperature_classification(self):
        assert classify_temperature(40.0) == "Sangat Panas"
        assert classify_temperature(35.0) == "Panas"
        assert classify_temperature(25.0) == "Normal"
        assert classify_temperature(15.0) == "Dingin"
        assert classify_temperature(float("nan")) == "Tidak Diketahui"

    def test_temperature_thresholds(self):
        assert classify_temperature(cfg.TEMP_SANGAT_PANAS) == "Sangat Panas"
        assert classify_temperature(cfg.TEMP_PANAS) == "Panas"
        assert classify_temperature(cfg.TEMP_NORMAL) == "Normal"
        assert classify_temperature(cfg.TEMP_NORMAL - 0.1) == "Dingin"

    def test_humidity_classification(self):
        assert classify_humidity(90.0) == "Sangat Lembap"
        assert classify_humidity(75.0) == "Lembap"
        assert classify_humidity(50.0) == "Normal"
        assert classify_humidity(30.0) == "Kering"
        assert classify_humidity(float("nan")) == "Tidak Diketahui"

    def test_wind_classification(self):
        assert classify_wind(50.0) == "Kencang"
        assert classify_wind(25.0) == "Sedang"
        assert classify_wind(10.0) == "Ringan"
        assert classify_wind(2.0) == "Tenang"
        assert classify_wind(float("nan")) == "Tidak Diketahui"

    def test_rainfall_classification(self):
        assert classify_rainfall(25.0) == "Hujan Lebat"
        assert classify_rainfall(10.0) == "Hujan Sedang"
        assert classify_rainfall(1.0) == "Hujan Ringan"
        assert classify_rainfall(0.0) == "Tidak Hujan"
        assert classify_rainfall(float("nan")) == "Tidak Diketahui"

    def test_classify_dataframe(self):
        df = _make_df(3)
        result = classify(df)
        assert "temp_class" in result.columns
        assert "humidity_class" in result.columns
        assert "wind_class" in result.columns
        assert "rainfall_class" in result.columns
        assert result["temp_class"].notna().all()

    def test_empty_df(self):
        df = pd.DataFrame()
        result = classify(df)
        assert "temp_class" in result.columns


# ── Trend analysis ─────────────────────────────────────────────────


class TestTrends:
    def test_moving_average_columns(self):
        df = _make_df(5)
        result = compute_trends(df)
        assert "temp_ma" in result.columns
        assert "humidity_ma" in result.columns
        assert "temp_delta" in result.columns
        assert "humidity_delta" in result.columns

    def test_moving_average_values(self):
        df = _make_df(3, base_temp=20)
        # temps: 20, 21, 22
        result = compute_trends(df, window=3)
        # First row: window=1, mean=20
        assert result.loc[0, "temp_ma"] == pytest.approx(20.0)
        # Second row: window=2, mean=(20+21)/2=20.5
        assert result.loc[1, "temp_ma"] == pytest.approx(20.5)
        # Third row: window=3, mean=(20+21+22)/3=21.0
        assert result.loc[2, "temp_ma"] == pytest.approx(21.0)

    def test_delta_first_row_is_nan(self):
        df = _make_df(3)
        result = compute_trends(df)
        assert pd.isna(result.loc[0, "temp_delta"])

    def test_delta_values(self):
        df = _make_df(3, base_temp=20)
        # temps: 20, 21, 22
        result = compute_trends(df)
        assert result.loc[1, "temp_delta"] == pytest.approx(1.0)
        assert result.loc[2, "temp_delta"] == pytest.approx(1.0)

    def test_trends_per_location(self):
        df = pd.concat(
            [
                _make_df(2, location="A", base_temp=20),
                _make_df(2, location="B", base_temp=30),
            ],
            ignore_index=True,
        )
        result = compute_trends(df)
        a = result[result["location"] == "A"]
        b = result[result["location"] == "B"]
        assert a.iloc[0]["temp_delta"] is np.nan or pd.isna(a.iloc[0]["temp_delta"])
        assert b.iloc[0]["temp_delta"] is np.nan or pd.isna(b.iloc[0]["temp_delta"])

    def test_empty_df(self):
        df = pd.DataFrame()
        result = compute_trends(df)
        assert "temp_ma" in result.columns


# ── Anomaly detection ──────────────────────────────────────────────


class TestAnomaly:
    def test_detects_spike(self):
        # Need enough rows so z-score is meaningful (spike inflates std)
        df = _make_df(20, base_temp=25)
        df.loc[2, "temperature"] = 100.0
        result = detect_anomalies(df)
        assert "is_anomaly" in result.columns
        assert result.loc[2, "is_anomaly"] == True  # noqa: E712

    def test_normal_data_not_anomalous(self):
        df = _make_df(10, base_temp=25)
        result = detect_anomalies(df)
        assert result["is_anomaly"].sum() == 0

    def test_single_row_not_anomalous(self):
        df = _make_df(1)
        result = detect_anomalies(df)
        assert result.loc[0, "is_anomaly"] == False  # noqa: E712

    def test_anomaly_per_location(self):
        df = pd.concat(
            [
                _make_df(10, location="A", base_temp=25),
                _make_df(10, location="B", base_temp=30),
            ],
            ignore_index=True,
        )
        df.loc[2, "temperature"] = 100.0
        result = detect_anomalies(df)
        a = result[result["location"] == "A"]
        b = result[result["location"] == "B"]
        assert a["is_anomaly"].any()
        assert not b["is_anomaly"].any()

    def test_custom_threshold(self):
        df = _make_df(10, base_temp=25)
        df.loc[2, "temperature"] = 30.0  # mild spike
        # Strict threshold → should detect
        result = detect_anomalies(df, zscore_threshold=0.5)
        assert result["is_anomaly"].any()

    def test_empty_df(self):
        df = pd.DataFrame()
        result = detect_anomalies(df)
        assert "is_anomaly" in result.columns


# ── Prediction ─────────────────────────────────────────────────────


class TestPredict:
    def test_adds_predicted_column(self):
        df = _make_df(5)
        result = predict(df)
        assert "predicted_temp" in result.columns

    def test_first_prediction_is_nan(self):
        df = _make_df(3)
        result = predict(df)
        assert pd.isna(result.loc[0, "predicted_temp"])

    def test_prediction_uses_moving_average(self):
        df = _make_df(4, base_temp=20)
        # temps: 20, 21, 22, 23
        result = predict(df, window=3)
        # Second row prediction = mean of first 1 row (min_periods=1) = 20.0
        # Third row prediction = mean of first 2 rows = 20.5
        # Fourth row prediction = mean of first 3 rows = 21.0
        assert result.loc[1, "predicted_temp"] == pytest.approx(20.0)
        assert result.loc[2, "predicted_temp"] == pytest.approx(20.5)
        assert result.loc[3, "predicted_temp"] == pytest.approx(21.0)

    def test_prediction_per_location(self):
        df = pd.concat(
            [
                _make_df(2, location="A", base_temp=20),
                _make_df(2, location="B", base_temp=30),
            ],
            ignore_index=True,
        )
        result = predict(df)
        a = result[result["location"] == "A"]
        b = result[result["location"] == "B"]
        # First row per location should be NaN
        assert pd.isna(a.iloc[0]["predicted_temp"])
        assert pd.isna(b.iloc[0]["predicted_temp"])

    def test_single_row(self):
        df = _make_df(1)
        result = predict(df)
        assert pd.isna(result.loc[0, "predicted_temp"])

    def test_empty_df(self):
        df = pd.DataFrame()
        result = predict(df)
        assert "predicted_temp" in result.columns


# ── Integration: full pipeline ─────────────────────────────────────


class TestFullPipeline:
    def test_pipeline_end_to_end(self):
        """Run the full pipeline on sample data."""
        df = _make_df(10, base_temp=25)
        cleaned = clean(df)
        standardized = standardize(cleaned)
        with_features = add_features(standardized)
        classified = classify(with_features)
        with_trends = compute_trends(classified)
        with_anomalies = detect_anomalies(with_trends)
        final = predict(with_anomalies)

        assert len(final) == 10
        assert "temp_class" in final.columns
        assert "temp_ma" in final.columns
        assert "is_anomaly" in final.columns
        assert "predicted_temp" in final.columns
        assert "temp_avg" in final.columns

    def test_pipeline_with_mixed_locations(self):
        """Pipeline handles multiple locations correctly."""
        df = pd.concat(
            [
                _make_df(5, location="Medan Kota", base_temp=28),
                _make_df(5, location="Medan Amplas", base_temp=32),
            ],
            ignore_index=True,
        )
        cleaned = clean(df)
        standardized = standardize(cleaned)
        classified = classify(standardized)
        with_trends = compute_trends(classified)
        final = detect_anomalies(with_trends)

        assert len(final) == 10
        assert final["temp_class"].notna().all()

    def test_pipeline_empty_input(self):
        """Pipeline handles empty input gracefully."""
        df = pd.DataFrame()
        cleaned = clean(df)
        standardized = standardize(cleaned)
        with_features = add_features(standardized)
        classified = classify(with_features)
        with_trends = compute_trends(classified)
        with_anomalies = detect_anomalies(with_trends)
        final = predict(with_anomalies)

        assert len(final) == 0
        assert "temp_class" in final.columns
        assert "is_anomaly" in final.columns

    def test_pipeline_no_data_loss(self):
        """All rows survive cleaning (no invalid data in test set)."""
        df = _make_df(5)
        result = clean(df)
        assert len(result) == 5


# ── Config thresholds ──────────────────────────────────────────────


class TestConfig:
    def test_default_thresholds(self):
        assert cfg.TEMP_SANGAT_PANAS == 38.0
        assert cfg.TEMP_PANAS == 33.0
        assert cfg.TEMP_NORMAL == 20.0
        assert cfg.HUMIDITY_SANGAT_LEMBAP == 85.0
        assert cfg.HUMIDITY_LEMBAP == 70.0
        assert cfg.HUMIDITY_NORMAL == 40.0
        assert cfg.WIND_KENCANG == 40.0
        assert cfg.WIND_SEDANG == 20.0
        assert cfg.WIND_RINGAN == 5.0
        assert cfg.RAIN_LEBAT == 20.0
        assert cfg.RAIN_SEDANG == 7.5
        assert cfg.RAIN_RINGAN == 0.5

    def test_thresholds_env_override(self, monkeypatch):
        monkeypatch.setenv("TEMP_SANGAT_PANAS", "45.0")
        # Need to reimport to pick up env change
        import importlib

        import etl.transform.config

        importlib.reload(etl.transform.config)
        assert etl.transform.config.TEMP_SANGAT_PANAS == 45.0
        # Restore default
        monkeypatch.delenv("TEMP_SANGAT_PANAS")
        importlib.reload(etl.transform.config)
