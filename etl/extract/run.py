"""CLI entry point: fetch weather data for all Medan kecamatan and store raw.

Usage:
    cd etl && python -m etl.extract.run
    WEATHER_PROVIDER=mock python -m etl.extract.run
"""

import logging
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

# Load .env from etl/ directory (or nearest parent)
load_dotenv()

from etl.extract.config import get_provider
from etl.extract.storage import save_raw_observation

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("etl.extract.run")

# 21 kecamatan Kota Medan — matches dim_location seed data
KECAMATAN_MEDAN = [
    "Medan Amplas",
    "Medan Area",
    "Medan Barat",
    "Medan Baru",
    "Medan Belawan",
    "Medan Deli",
    "Medan Denai",
    "Medan Helvetia",
    "Medan Johor",
    "Medan Kota",
    "Medan Labuhan",
    "Medan Maimun",
    "Medan Marelan",
    "Medan Perjuangan",
    "Medan Petisah",
    "Medan Polonia",
    "Medan Selayang",
    "Medan Sunggal",
    "Medan Tembung",
    "Medan Tuntungan",
    "Medan Timur",
]


def main() -> None:
    provider = get_provider()
    source_name = type(provider).__name__.replace("Provider", "")
    logger.info(
        "Starting extract run — provider=%s, locations=%d",
        source_name,
        len(KECAMATAN_MEDAN),
    )

    success, failed = 0, 0
    for kec in KECAMATAN_MEDAN:
        try:
            raw_json, normalized = provider.fetch_current(kec)
            save_raw_observation(
                source=source_name,
                raw_json=raw_json,
                observed_at=normalized.observed_at,
            )
            logger.info(
                "  %s: %.1f°C, %s",
                kec,
                normalized.temperature or 0.0,
                normalized.condition_desc or "N/A",
            )
            success += 1
        except Exception:
            logger.exception("  %s: FAILED", kec)
            failed += 1

    logger.info(
        "Extract complete — %d succeeded, %d failed out of %d",
        success,
        failed,
        len(KECAMATAN_MEDAN),
    )
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
