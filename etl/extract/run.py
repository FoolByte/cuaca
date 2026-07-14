"""CLI entry point: fetch weather data from BMKG for all Medan kelurahan.

Only stores the nearest forecast entry (current BMKG cycle) per kelurahan,
keeping all kelurahan in sync at the same timestamp.

Usage:
    cd etl && python -m extract.run
    WEATHER_PROVIDER=mock python -m extract.run
"""

import logging
import os
import sys
from datetime import UTC, datetime

from dotenv import load_dotenv

load_dotenv()

from etl.extract.config import get_provider  # noqa: E402
from etl.extract.medan_adm4 import KECAMATAN, all_kelurahan_adm4  # noqa: E402
from etl.extract.models import NormalizedWeatherData  # noqa: E402
from etl.extract.storage import save_raw_observation  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("etl.extract.run")


def _entry_to_raw(entry: dict, lokasi: dict) -> dict:
    """Wrap a single forecast entry into a minimal dict for storage."""
    return {"lokasi": lokasi, "cuaca": [entry]}


def _nearest_entry(entries: list[NormalizedWeatherData]) -> NormalizedWeatherData | None:
    """Pick the entry closest to now (current BMKG forecast cycle)."""
    if not entries:
        return None
    now = datetime.now(UTC).replace(tzinfo=None)
    return min(entries, key=lambda e: abs((e.observed_at - now).total_seconds()))


def main() -> None:
    provider = get_provider()
    source_name = type(provider).__name__.replace("Provider", "")
    adm4_codes = all_kelurahan_adm4()
    dsn = os.environ.get("DATABASE_URL", "")
    logger.info(
        "Starting extract run — provider=%s, kelurahan=%d",
        source_name,
        len(adm4_codes),
    )

    success, failed = 0, 0
    for adm4 in adm4_codes:
        kec_code = adm4.split(".")[2]
        kec_name = KECAMATAN[kec_code]["name"]
        try:
            if hasattr(provider, "fetch_all_forecasts"):
                raw_json, entries = provider.fetch_all_forecasts(adm4)
                # Only store the nearest forecast entry (current cycle)
                nearest = _nearest_entry(entries)
                if nearest is None:
                    logger.warning("  %s (%s): no entries", adm4, kec_name)
                    failed += 1
                    continue

                # Extract lokasi from raw response
                data_list = raw_json.get("data", [])
                lokasi = data_list[0].get("lokasi", {}) if data_list else {}

                # Find the matching raw entry for nearest timestamp
                cuaca_groups = data_list[0].get("cuaca", []) if data_list else []
                raw_entry = {}
                for group in cuaca_groups:
                    for e in group:
                        e_dt = e.get("datetime", "")
                        if e_dt:
                            e_time = datetime.fromisoformat(
                                e_dt.replace("Z", "+00:00")
                            ).replace(tzinfo=None)
                            if abs((e_time - nearest.observed_at).total_seconds()) < 60:
                                raw_entry = e
                                break
                    if raw_entry:
                        break

                save_raw_observation(
                    source=source_name,
                    raw_json=_entry_to_raw(raw_entry, lokasi),
                    observed_at=nearest.observed_at,
                    dsn=dsn,
                )
                logger.info(
                    "  %s (%s): %.1f°C at %s",
                    adm4,
                    kec_name,
                    nearest.temperature or 0.0,
                    nearest.observed_at,
                )
            else:
                raw_json, normalized = provider.fetch_current(adm4)
                save_raw_observation(
                    source=source_name,
                    raw_json=raw_json,
                    observed_at=normalized.observed_at,
                    dsn=dsn,
                )
                logger.info(
                    "  %s (%s): %.1f°C, %s",
                    adm4,
                    kec_name,
                    normalized.temperature or 0.0,
                    normalized.condition_desc or "N/A",
                )
            success += 1
        except Exception:
            logger.exception("  %s (%s): FAILED", adm4, kec_name)
            failed += 1

    logger.info(
        "Extract complete — %d succeeded, %d failed out of %d",
        success,
        failed,
        len(adm4_codes),
    )
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
