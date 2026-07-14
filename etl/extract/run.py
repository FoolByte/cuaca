"""CLI entry point: fetch ALL forecast data from BMKG for all Medan kelurahan.

BMKG returns 3 days × 8 intervals = ~24 forecast entries per kelurahan.
Updates 2x daily. Dedup is handled by ON CONFLICT in the load phase.

Usage:
    cd etl && python -m extract.run
    WEATHER_PROVIDER=mock python -m extract.run
"""

import logging
import sys

from dotenv import load_dotenv

load_dotenv()

from etl.extract.config import get_provider  # noqa: E402
from etl.extract.medan_adm4 import KECAMATAN, all_kelurahan_adm4  # noqa: E402
from etl.extract.storage import save_raw_observation  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("etl.extract.run")


def _entry_to_raw(entry: dict, lokasi: dict) -> dict:
    """Wrap a single forecast entry into a minimal dict for storage.

    Avoids storing the full API response 24× per kelurahan.
    """
    return {"lokasi": lokasi, "cuaca": [entry]}


def main() -> None:
    provider = get_provider()
    source_name = type(provider).__name__.replace("Provider", "")
    adm4_codes = all_kelurahan_adm4()
    logger.info(
        "Starting extract run — provider=%s, kelurahan=%d",
        source_name,
        len(adm4_codes),
    )

    success, failed, total_entries = 0, 0, 0
    for adm4 in adm4_codes:
        kec_code = adm4.split(".")[2]
        kec_name = KECAMATAN[kec_code]["name"]
        try:
            if hasattr(provider, "fetch_all_forecasts"):
                raw_json, entries = provider.fetch_all_forecasts(adm4)
                # Extract lokasi from raw response for individual entry storage
                data_list = raw_json.get("data", [])
                lokasi = data_list[0].get("lokasi", {}) if data_list else {}

                # Re-fetch individual forecast entries from raw_json
                cuaca_groups = data_list[0].get("cuaca", []) if data_list else []
                flat_entries = []
                for group in cuaca_groups:
                    flat_entries.extend(group)

                for entry in flat_entries:
                    observed_at_str = entry.get("datetime", "")
                    if not observed_at_str:
                        continue
                    from datetime import datetime

                    observed_at = datetime.fromisoformat(
                        observed_at_str.replace("Z", "+00:00")
                    ).replace(tzinfo=None)
                    save_raw_observation(
                        source=source_name,
                        raw_json=_entry_to_raw(entry, lokasi),
                        observed_at=observed_at,
                    )
                total_entries += len(flat_entries)
                logger.info(
                    "  %s (%s): %d forecasts saved",
                    adm4,
                    kec_name,
                    len(flat_entries),
                )
            else:
                raw_json, normalized = provider.fetch_current(adm4)
                save_raw_observation(
                    source=source_name,
                    raw_json=raw_json,
                    observed_at=normalized.observed_at,
                )
                total_entries += 1
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
        "Extract complete — %d succeeded, %d failed out of %d (%d total forecast entries)",
        success,
        failed,
        len(adm4_codes),
        total_entries,
    )
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
