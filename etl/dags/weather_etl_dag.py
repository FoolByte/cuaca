"""Airflow DAG: Weather ETL Pipeline for Kota Medan.

Schedule interval is configurable via Airflow Variable `weather_etl_interval_minutes`
(default: 10). Change it in the Airflow UI without redeploying.

The DAG runs: extract >> transform >> load
Each task has retries with exponential backoff.

DWH credentials come from Airflow Connection `weather_dwh`
(set via AIRFLOW_CONN_WEATHER_DWH env var in docker-compose).
"""

import logging
import os
import sys
from datetime import timedelta

from airflow import DAG
from airflow.models import Variable
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago

logger = logging.getLogger(__name__)

# ── Helpers ─────────────────────────────────────────────────────────


def _get_interval_minutes() -> int:
    """Read schedule interval from Airflow Variable, default 10."""
    try:
        return int(Variable.get("weather_etl_interval_minutes", default_var="10"))
    except (ValueError, TypeError):
        return 10


def _get_dsn() -> str:
    """Get DWH connection string from Airflow Connection or env var."""
    from airflow.hooks.base import BaseHook

    try:
        conn = BaseHook.get_connection("weather_dwh")
        return conn.get_uri()
    except Exception:
        # Fallback to env var (for local dev / testing)
        dsn = os.environ.get("DATABASE_URL", "")
        if not dsn:
            raise ValueError(
                "No DWH connection: set Airflow Connection 'weather_dwh' "
                "or DATABASE_URL env var"
            )
        return dsn


# ── Task callables ──────────────────────────────────────────────────


def run_extract(**context) -> None:
    """Extract weather data from provider and save to staging."""
    # Ensure etl package is importable
    etl_dir = os.path.join(os.path.dirname(__file__), "..")
    if etl_dir not in sys.path:
        sys.path.insert(0, os.path.abspath(etl_dir))

    from etl.extract.config import get_provider
    from etl.extract.medan_adm4 import KECAMATAN, all_kelurahan_adm4
    from etl.extract.storage import save_raw_observation

    dsn = _get_dsn()
    provider = get_provider()
    source_name = type(provider).__name__.replace("Provider", "")
    adm4_codes = all_kelurahan_adm4()

    logger.info(
        "Extract: provider=%s, kelurahan=%d", source_name, len(adm4_codes)
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
                dsn=dsn,
            )
            success += 1
        except Exception:
            logger.exception("Extract failed: %s (%s)", adm4, kec_name)
            failed += 1

    logger.info("Extract done: %d ok, %d failed", success, failed)
    if failed == len(adm4_codes):
        raise RuntimeError("All extractions failed")


def run_transform(**context) -> None:
    """Transform raw observations into clean, classified data."""
    etl_dir = os.path.join(os.path.dirname(__file__), "..")
    if etl_dir not in sys.path:
        sys.path.insert(0, os.path.abspath(etl_dir))

    from etl.transform.run import run_transform

    dsn = _get_dsn()
    result = run_transform(dsn)
    if result.empty:
        logger.warning("Transform: no data to transform")
    else:
        logger.info("Transform: %d rows processed", len(result))


def run_load(**context) -> None:
    """Load transformed data into the Data Warehouse."""
    etl_dir = os.path.join(os.path.dirname(__file__), "..")
    if etl_dir not in sys.path:
        sys.path.insert(0, os.path.abspath(etl_dir))

    from etl.load.loader import load
    from etl.transform.run import run_transform

    dsn = _get_dsn()
    transformed = run_transform(dsn)
    if transformed.empty:
        logger.warning("Load: no data to load")
        return

    result = load(transformed, dsn)
    logger.info(
        "Load done: inserted=%d, skipped=%d", result["inserted"], result["skipped"]
    )


# ── DAG definition ─────────────────────────────────────────────────

default_args = {
    "owner": "weather-etl",
    "depends_on_past": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=2),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=15),
    "execution_timeout": timedelta(minutes=10),
    "on_failure_callback": lambda context: logger.error(
        "Task %s failed in DAG %s (run_id=%s)",
        context.get("task_instance", {}).task_id,
        context.get("dag", {}).dag_id,
        context.get("run_id"),
    ),
}

with DAG(
    dag_id="weather_etl",
    default_args=default_args,
    description="Weather ETL pipeline for Kota Medan (extract → transform → load)",
    schedule_interval=timedelta(minutes=_get_interval_minutes()),
    start_date=days_ago(1),
    catchup=False,
    tags=["weather", "etl", "medan"],
    doc_md=__doc__,
) as dag:

    t_extract = PythonOperator(
        task_id="extract",
        python_callable=run_extract,
        doc="Extract weather data from BMKG/Mock provider into staging table.",
    )

    t_transform = PythonOperator(
        task_id="transform",
        python_callable=run_transform,
        doc="Clean, classify, and enrich raw weather observations.",
    )

    t_load = PythonOperator(
        task_id="load",
        python_callable=run_load,
        doc="Load transformed data into star schema (dim + fact tables).",
    )

    t_extract >> t_transform >> t_load
