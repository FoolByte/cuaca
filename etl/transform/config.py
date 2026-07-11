"""Classification thresholds and transform configuration.

All thresholds are configurable — override via environment variables
or by modifying the constants below.
"""

import os


def _env_float(key: str, default: float) -> float:
    val = os.environ.get(key)
    return float(val) if val is not None else default


# ── Temperature classification (°C) ────────────────────────────────
TEMP_SANGAT_PANAS = _env_float("TEMP_SANGAT_PANAS", 38.0)
TEMP_PANAS = _env_float("TEMP_PANAS", 33.0)
TEMP_NORMAL = _env_float("TEMP_NORMAL", 20.0)
# Below TEMP_NORMAL → Dingin

# ── Humidity classification (%) ────────────────────────────────────
HUMIDITY_SANGAT_LEMBAP = _env_float("HUMIDITY_SANGAT_LEMBAP", 85.0)
HUMIDITY_LEMBAP = _env_float("HUMIDITY_LEMBAP", 70.0)
HUMIDITY_NORMAL = _env_float("HUMIDITY_NORMAL", 40.0)
# Below HUMIDITY_NORMAL → Kering

# ── Wind speed classification (km/h) ───────────────────────────────
WIND_KENCANG = _env_float("WIND_KENCANG", 40.0)
WIND_SEDANG = _env_float("WIND_SEDANG", 20.0)
WIND_RINGAN = _env_float("WIND_RINGAN", 5.0)
# Below WIND_RINGAN → Tenang

# ── Rainfall classification (mm) ───────────────────────────────────
RAIN_LEBAT = _env_float("RAIN_LEBAT", 20.0)
RAIN_SEDANG = _env_float("RAIN_SEDANG", 7.5)
RAIN_RINGAN = _env_float("RAIN_RINGAN", 0.5)
# Below RAIN_RINGAN → Tidak Hujan

# ── Trend / anomaly parameters ─────────────────────────────────────
MOVING_AVG_WINDOW = int(os.environ.get("MOVING_AVG_WINDOW", "3"))
ANOMALY_ZSCORE_THRESHOLD = _env_float("ANOMALY_ZSCORE_THRESHOLD", 2.5)
