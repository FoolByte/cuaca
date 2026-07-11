"""CLI entry point: load transformed weather data into the Data Warehouse.

Usage:
    cd etl && python -m load.run
"""

import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from etl.load.loader import load  # noqa: E402
from etl.transform.run import run_transform  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("etl.load.run")


def main() -> None:
    dsn = os.environ.get("DATABASE_URL", "")
    if not dsn:
        logger.error("DATABASE_URL not set")
        sys.exit(1)

    logger.info("Starting transform...")
    transformed = run_transform(dsn)
    if transformed.empty:
        logger.info("No data to load")
        sys.exit(0)

    logger.info("Loading %d rows into Data Warehouse...", len(transformed))
    result = load(transformed, dsn)

    logger.info(
        "Load complete — inserted=%d, skipped=%d, quality_issues=%d",
        result["inserted"],
        result["skipped"],
        result["quality_issues"],
    )


if __name__ == "__main__":
    main()
