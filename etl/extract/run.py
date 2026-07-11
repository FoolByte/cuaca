"""CLI entry point: fetch weather data for all Medan kelurahan and store raw.

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


def main() -> None:
    provider = get_provider()
    source_name = type(provider).__name__.replace("Provider", "")
    adm4_codes = all_kelurahan_adm4()
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
            raw_json, normalized = provider.fetch_current(adm4)
            save_raw_observation(
                source=source_name,
                raw_json=raw_json,
                observed_at=normalized.observed_at,
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
