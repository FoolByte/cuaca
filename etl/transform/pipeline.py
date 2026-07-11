"""Transform pipeline — cleaning, standardization, feature engineering,
classification, trend analysis, anomaly detection, prediction.

All functions accept and return pandas DataFrames.
Column contract (input):
    observed_at (datetime), location (str), source (str),
    temperature, humidity, pressure, wind_direction (str),
    wind_speed, rainfall, uv_index, visibility,
    cloud_coverage, condition_code (str), condition_desc (str)

All numeric columns are nullable.
"""

import logging

import numpy as np
import pandas as pd

from etl.transform import config as cfg

logger = logging.getLogger(__name__)

# Required columns for the pipeline
REQUIRED_COLS = ["observed_at", "location"]
NUMERIC_COLS = [
    "temperature",
    "humidity",
    "pressure",
    "wind_speed",
    "rainfall",
    "uv_index",
    "visibility",
    "cloud_coverage",
]
STRING_COLS = [
    "location",
    "source",
    "wind_direction",
    "condition_code",
    "condition_desc",
]


# ── Cleaning ───────────────────────────────────────────────────────


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Remove duplicates, drop rows missing required fields, clamp invalid values.

    - Drops duplicate (observed_at, location) rows (keeps first).
    - Drops rows where observed_at or location is null.
    - Clamps numeric columns to valid ranges (e.g. humidity 0-100).
    """
    if df.empty:
        return df.copy()

    out = df.copy()

    # Drop rows missing required columns
    out = out.dropna(subset=REQUIRED_COLS)

    # Remove duplicates by (observed_at, location)
    out = out.drop_duplicates(subset=["observed_at", "location"], keep="first")

    # Clamp numeric columns to valid ranges
    clamps = {
        "humidity": (0, 100),
        "cloud_coverage": (0, 100),
        "wind_speed": (0, None),
        "rainfall": (0, None),
        "temperature": (-90, 60),
        "pressure": (300, 1100),
        "uv_index": (0, 16),
        "visibility": (0, None),
    }
    for col, (lo, hi) in clamps.items():
        if col in out.columns:
            if lo is not None:
                out.loc[out[col] < lo, col] = np.nan
            if hi is not None:
                out.loc[out[col] > hi, col] = np.nan

    logger.info(
        "Clean: %d → %d rows (%d removed)",
        len(df),
        len(out),
        len(df) - len(out),
    )
    return out.reset_index(drop=True)


# ── Standardization ────────────────────────────────────────────────


def standardize(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize formats: ISO 8601 timestamps, trimmed strings, consistent units.

    - observed_at → UTC timezone-aware datetime.
    - String columns → stripped, None for empty.
    - wind_direction → uppercase.
    """
    if df.empty:
        return df.copy()

    out = df.copy()

    # Ensure observed_at is UTC-aware datetime
    out["observed_at"] = pd.to_datetime(out["observed_at"], utc=True, errors="coerce")

    # Trim strings, convert empty to None
    for col in STRING_COLS:
        if col in out.columns:
            out[col] = (
                out[col]
                .astype(str)
                .str.strip()
                .replace({"None": None, "nan": None, "": None})
            )

    # Uppercase wind direction
    if "wind_direction" in out.columns:
        out["wind_direction"] = out["wind_direction"].str.upper()

    return out


# ── Feature engineering ────────────────────────────────────────────


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add aggregated features per location.

    Adds columns: temp_avg, temp_max, temp_min,
    humidity_avg, pressure_avg (aggregated over all rows per location).
    """
    if df.empty:
        for col in ["temp_avg", "temp_max", "temp_min", "humidity_avg", "pressure_avg"]:
            df = df.assign(**{col: pd.Series(dtype="float64")})
        return df

    out = df.copy()

    agg = out.groupby("location").agg(
        temp_avg=("temperature", "mean"),
        temp_max=("temperature", "max"),
        temp_min=("temperature", "min"),
        humidity_avg=("humidity", "mean"),
        pressure_avg=("pressure", "mean"),
    )
    out = out.merge(agg, on="location", how="left", suffixes=("", "_agg"))

    # Rename if merge created suffixed columns
    for col in ["temp_avg", "temp_max", "temp_min", "humidity_avg", "pressure_avg"]:
        suffixed = f"{col}_agg"
        if suffixed in out.columns:
            out[col] = out[suffixed]
            out.drop(columns=[suffixed], inplace=True)
        elif col not in out.columns:
            out[col] = np.nan

    return out


# ── Classification ─────────────────────────────────────────────────


def classify_temperature(temp: float) -> str:
    """Classify temperature into categories."""
    if pd.isna(temp):
        return "Tidak Diketahui"
    if temp >= cfg.TEMP_SANGAT_PANAS:
        return "Sangat Panas"
    if temp >= cfg.TEMP_PANAS:
        return "Panas"
    if temp >= cfg.TEMP_NORMAL:
        return "Normal"
    return "Dingin"


def classify_humidity(humidity: float) -> str:
    """Classify humidity into categories."""
    if pd.isna(humidity):
        return "Tidak Diketahui"
    if humidity >= cfg.HUMIDITY_SANGAT_LEMBAP:
        return "Sangat Lembap"
    if humidity >= cfg.HUMIDITY_LEMBAP:
        return "Lembap"
    if humidity >= cfg.HUMIDITY_NORMAL:
        return "Normal"
    return "Kering"


def classify_wind(wind_speed: float) -> str:
    """Classify wind speed into categories."""
    if pd.isna(wind_speed):
        return "Tidak Diketahui"
    if wind_speed >= cfg.WIND_KENCANG:
        return "Kencang"
    if wind_speed >= cfg.WIND_SEDANG:
        return "Sedang"
    if wind_speed >= cfg.WIND_RINGAN:
        return "Ringan"
    return "Tenang"


def classify_rainfall(rainfall: float) -> str:
    """Classify rainfall into categories."""
    if pd.isna(rainfall):
        return "Tidak Diketahui"
    if rainfall >= cfg.RAIN_LEBAT:
        return "Hujan Lebat"
    if rainfall >= cfg.RAIN_SEDANG:
        return "Hujan Sedang"
    if rainfall >= cfg.RAIN_RINGAN:
        return "Hujan Ringan"
    return "Tidak Hujan"


def classify(df: pd.DataFrame) -> pd.DataFrame:
    """Add classification columns to the DataFrame."""
    if df.empty:
        for col in [
            "temp_class",
            "humidity_class",
            "wind_class",
            "rainfall_class",
        ]:
            df = df.assign(**{col: pd.Series(dtype="object")})
        return df

    out = df.copy()
    out["temp_class"] = out["temperature"].apply(classify_temperature)
    out["humidity_class"] = out["humidity"].apply(classify_humidity)
    out["wind_class"] = out["wind_speed"].apply(classify_wind)
    out["rainfall_class"] = out["rainfall"].apply(classify_rainfall)
    return out


# ── Trend analysis ─────────────────────────────────────────────────


def compute_trends(
    df: pd.DataFrame,
    window: int | None = None,
) -> pd.DataFrame:
    """Compute moving average and delta per location.

    Adds columns: temp_ma, humidity_ma, temp_delta, humidity_delta.
    Data must be sorted by (location, observed_at) for correct results.
    """
    if df.empty:
        for col in ["temp_ma", "humidity_ma", "temp_delta", "humidity_delta"]:
            df = df.assign(**{col: pd.Series(dtype="float64")})
        return df

    out = df.copy()
    w = window or cfg.MOVING_AVG_WINDOW

    out = out.sort_values(["location", "observed_at"]).reset_index(drop=True)

    # Moving averages per location
    out["temp_ma"] = (
        out.groupby("location")["temperature"]
        .transform(lambda s: s.rolling(window=w, min_periods=1).mean())
    )
    out["humidity_ma"] = (
        out.groupby("location")["humidity"]
        .transform(lambda s: s.rolling(window=w, min_periods=1).mean())
    )

    # Delta (change from previous period) per location
    out["temp_delta"] = out.groupby("location")["temperature"].diff()
    out["humidity_delta"] = out.groupby("location")["humidity"].diff()

    return out


# ── Anomaly detection ──────────────────────────────────────────────


def detect_anomalies(
    df: pd.DataFrame,
    zscore_threshold: float | None = None,
) -> pd.DataFrame:
    """Detect anomalies using z-score per location.

    Adds boolean column: is_anomaly.
    Requires at least 2 data points per location; locations with < 2 rows
    are marked as not anomalous.
    """
    if df.empty:
        return df.assign(is_anomaly=pd.Series(dtype="bool"))

    out = df.copy()
    threshold = zscore_threshold or cfg.ANOMALY_ZSCORE_THRESHOLD

    def _zscore_flag(temp: pd.Series) -> pd.Series:
        mean = temp.mean()
        std = temp.std()
        if pd.isna(std) or std == 0:
            return pd.Series(False, index=temp.index)
        z = (temp - mean).abs() / std
        return z > threshold

    # Use transform for per-group calculation, then apply threshold
    grouped = out.groupby("location")["temperature"]

    def _z(s: pd.Series) -> pd.Series:
        if s.std() > 0:
            return (s - s.mean()) / s.std()
        return pd.Series(0, index=s.index)

    out["_z"] = grouped.transform(_z)
    out["is_anomaly"] = out["_z"].abs() > threshold
    small_groups = (
        out.groupby("location")["temperature"].transform("count") < 2
    )
    out.loc[small_groups, "is_anomaly"] = False
    out.drop(columns=["_z"], inplace=True)
    return out


# ── Prediction ─────────────────────────────────────────────────────


def predict(
    df: pd.DataFrame,
    window: int | None = None,
) -> pd.DataFrame:
    """Simple temperature prediction using moving average extrapolation.

    For each location, uses the last `window` observations to predict
    the next temperature. Adds column: predicted_temp.
    """
    if df.empty:
        return df.assign(predicted_temp=pd.Series(dtype="float64"))

    out = df.copy()
    w = window or cfg.MOVING_AVG_WINDOW

    out = out.sort_values("observed_at").reset_index(drop=True)

    # Compute per-location rolling mean shifted by 1
    out["predicted_temp"] = (
        out.groupby("location")["temperature"]
        .transform(
            lambda s: s.rolling(window=w, min_periods=1).mean().shift(1)
        )
    )

    # Locations with only 1 row get NaN (shift produces NaN for first row)
    return out
