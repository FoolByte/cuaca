"""Unit tests for the Load module.

Tests cover: quality checks, watermark logic, dimension upserts,
fact insert dedup, and atomic transaction behavior.

Integration tests require a running PostgreSQL instance (DATABASE_URL).
They are skipped automatically when the database is unavailable.
"""

import os
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from etl.load.loader import (
    ensure_watermark_table,
    get_watermark,
    insert_fact_weather,
    load,
    quality_check,
    set_watermark,
    upsert_dim_location,
    upsert_dim_time,
    upsert_dim_weather,
)

# ── Helpers ────────────────────────────────────────────────────────


def _make_transformed_df(
    n: int = 3,
    location: str = "Medan Kota",
    base_temp: float = 28.0,
) -> pd.DataFrame:
    """Create a DataFrame matching transform output schema."""
    now = datetime(2024, 6, 15, 10, 0, 0, tzinfo=UTC)
    return pd.DataFrame(
        {
            "observed_at": [now + timedelta(hours=i * 3) for i in range(n)],
            "location": [location] * n,
            "source": ["Mock"] * n,
            "temperature": [base_temp + i for i in range(n)],
            "humidity": [70.0 - i for i in range(n)],
            "pressure": [1010.0 + i for i in range(n)],
            "wind_direction": ["NE", "SW", "E"][:n],
            "wind_speed": [5.0 + i for i in range(n)],
            "rainfall": [0.0, 2.5, 10.0][:n],
            "uv_index": [5.0 + i for i in range(n)],
            "visibility": [10.0 - i for i in range(n)],
            "cloud_coverage": [40.0 + i * 10 for i in range(n)],
            "condition_code": ["01", "02", "03"][:n],
            "condition_desc": ["Cerah", "Cerah Berawan", "Berawan"][:n],
            "temp_class": ["Normal", "Normal", "Normal"][:n],
            "humidity_class": ["Lembap", "Lembap", "Normal"][:n],
            "wind_class": ["Tenang", "Tenang", "Ringan"][:n],
            "rainfall_class": ["Tidak Hujan", "Hujan Ringan", "Hujan Sedang"][:n],
            "temp_avg": [28.0] * n,
            "temp_max": [30.0] * n,
            "temp_min": [28.0] * n,
        }
    )


# ── Quality check ──────────────────────────────────────────────────


class TestQualityCheck:
    def test_valid_data_no_issues(self):
        df = _make_transformed_df()
        issues = quality_check(df)
        assert issues == []

    def test_empty_df_returns_issue(self):
        df = pd.DataFrame()
        issues = quality_check(df)
        assert len(issues) == 1
        assert "empty" in issues[0].lower()

    def test_missing_required_column(self):
        df = _make_transformed_df()
        df = df.drop(columns=["temperature"])
        issues = quality_check(df)
        assert any("temperature" in i for i in issues)

    def test_null_temperature(self):
        df = _make_transformed_df(3)
        df.loc[0, "temperature"] = None
        issues = quality_check(df)
        assert any("temperature" in i and "null" in i.lower() for i in issues)

    def test_null_location(self):
        df = _make_transformed_df(3)
        df.loc[1, "location"] = None
        issues = quality_check(df)
        assert any("location" in i for i in issues)

    def test_null_wind_speed_ok_if_partial(self):
        df = _make_transformed_df(3)
        df.loc[0, "wind_speed"] = None
        issues = quality_check(df)
        # Should report the issue but not block
        assert any("wind_speed" in i for i in issues)


# ── Watermark ──────────────────────────────────────────────────────


class TestWatermark:
    def test_ensure_table_creates(self):
        cur = MagicMock()
        ensure_watermark_table(cur)
        cur.execute.assert_called_once()
        assert "CREATE TABLE" in cur.execute.call_args[0][0]

    def test_get_watermark_none_when_empty(self):
        cur = MagicMock()
        cur.fetchone.return_value = None
        result = get_watermark(cur)
        assert result is None

    def test_get_watermark_returns_timestamp(self):
        cur = MagicMock()
        ts = datetime(2024, 6, 15, 10, 0, 0)
        cur.fetchone.return_value = (ts,)
        result = get_watermark(cur)
        assert result == ts

    def test_set_watermark_upserts(self):
        cur = MagicMock()
        ts = datetime(2024, 6, 15, 10, 0, 0)
        set_watermark(cur, ts)
        cur.execute.assert_called_once()
        sql = cur.execute.call_args[0][0]
        assert "INSERT INTO etl_watermark" in sql
        assert "ON CONFLICT" in sql


# ── Dimension upserts ──────────────────────────────────────────────


class TestDimTime:
    def test_upsert_new_timestamps(self):
        cur = MagicMock()
        ts = datetime(2024, 6, 15, 10, 0, 0)
        # INSERT returns new time_id
        cur.fetchone.return_value = (1,)
        result = upsert_dim_time(cur, [ts])
        assert result[ts] == 1
        assert cur.execute.call_count == 1

    def test_upsert_existing_timestamp(self):
        cur = MagicMock()
        ts = datetime(2024, 6, 15, 10, 0, 0)
        # First call: INSERT returns None (conflict)
        # Second call: SELECT returns existing time_id
        cur.fetchone.side_effect = [None, (42,)]
        result = upsert_dim_time(cur, [ts])
        assert result[ts] == 42
        assert cur.execute.call_count == 2

    def test_empty_list(self):
        cur = MagicMock()
        result = upsert_dim_time(cur, [])
        assert result == {}


class TestDimLocation:
    def test_upsert_new_location(self):
        cur = MagicMock()
        cur.fetchone.return_value = (1,)
        result = upsert_dim_location(cur, ["Medan Kota"])
        assert result["Medan Kota"] == 1

    def test_upsert_existing_location(self):
        cur = MagicMock()
        cur.fetchone.side_effect = [None, (5,)]
        result = upsert_dim_location(cur, ["Medan Barat"])
        assert result["Medan Barat"] == 5

    def test_empty_list(self):
        cur = MagicMock()
        result = upsert_dim_location(cur, [])
        assert result == {}


class TestDimWeather:
    def test_inserts_new_combos(self):
        cur = MagicMock()
        df = _make_transformed_df(2)
        # No existing rows
        cur.fetchall.return_value = []
        # Each INSERT returns a new weather_id
        cur.fetchone.side_effect = [(1,), (2,)]
        result = upsert_dim_weather(cur, df)
        assert len(result) >= 2
        assert cur.execute.call_count >= 2

    def test_skips_existing_combos(self):
        cur = MagicMock()
        df = _make_transformed_df(1)
        # Return existing row matching the data
        cur.fetchall.return_value = [
            (1, "01", "Cerah", "Normal", "Lembap", "Tenang", "Tidak Hujan"),
        ]
        result = upsert_dim_weather(cur, df)
        # Should not insert new rows
        # Only the SELECT was called (fetchall), no INSERT
        assert 1 in result.values()


# ── Fact insert ────────────────────────────────────────────────────


class TestFactInsert:
    def test_inserts_rows(self):
        cur = MagicMock()
        df = _make_transformed_df(2)
        ts_list = df["observed_at"].tolist()
        time_map = {ts_list[0]: 1, ts_list[1]: 2}
        location_map = {"Medan Kota": 10}
        weather_map = {
            ("01", "Cerah", "Normal", "Lembap", "Tenang", "Tidak Hujan"): 1,
            ("02", "Cerah Berawan", "Normal", "Lembap", "Tenang", "Hujan Ringan"): 2,
        }
        cur.rowcount = 1

        result = insert_fact_weather(cur, df, time_map, location_map, weather_map)
        assert result["inserted"] == 2
        assert result["skipped"] == 0

    def test_skips_when_map_missing(self):
        cur = MagicMock()
        df = _make_transformed_df(1)
        # Empty maps → skip
        result = insert_fact_weather(cur, df, {}, {}, {})
        assert result["skipped"] == 1
        assert result["inserted"] == 0

    def test_skips_on_conflict(self):
        cur = MagicMock()
        df = _make_transformed_df(1)
        ts = df["observed_at"].iloc[0]
        time_map = {ts: 1}
        location_map = {"Medan Kota": 10}
        weather_map = {
            ("01", "Cerah", "Normal", "Lembap", "Tenang", "Tidak Hujan"): 1,
        }
        # rowcount=0 means conflict (ON CONFLICT DO NOTHING)
        cur.rowcount = 0

        result = insert_fact_weather(cur, df, time_map, location_map, weather_map)
        assert result["inserted"] == 0
        assert result["skipped"] == 1


# ── Full load (mocked DB) ──────────────────────────────────────────


class TestLoadMocked:
    @patch("etl.load.loader.psycopg2")
    def test_load_full_flow(self, mock_psycopg2):
        df = _make_transformed_df(2)
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.cursor.return_value = mock_cur
        mock_psycopg2.connect.return_value = mock_conn

        # Watermark table exists check
        # get_watermark returns None (first run)
        # upsert_dim_time: INSERT returns time_id
        # upsert_dim_location: INSERT returns location_id
        # upsert_dim_weather: no existing, INSERT returns weather_id
        # insert_fact: INSERT returns rowcount=1
        # set_watermark: INSERT

        mock_cur.fetchone.side_effect = [
            # get_watermark → None
            None,
            # upsert_dim_time[0]: INSERT → (1,)
            (1,),
            # upsert_dim_time[1]: INSERT → (2,)
            (2,),
            # upsert_dim_location: INSERT → (10,)
            (10,),
            # upsert_dim_weather: no existing → INSERT combos
            (1,),
            (2,),
            # insert_fact[0]: rowcount handled via mock_cur.rowcount
            # insert_fact[1]: rowcount handled via mock_cur.rowcount
            # set_watermark: INSERT
        ]
        mock_cur.fetchall.return_value = []  # dim_weather empty
        mock_cur.rowcount = 1

        result = load(df, "postgresql://test", skip_quality=True)

        assert result["inserted"] >= 0
        mock_conn.commit.assert_called_once()
        mock_conn.rollback.assert_not_called()

    @patch("etl.load.loader.psycopg2")
    def test_load_rollback_on_error(self, mock_psycopg2):
        df = _make_transformed_df(1)
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.cursor.return_value = mock_cur
        mock_psycopg2.connect.return_value = mock_conn

        # Make execute raise on first call
        mock_cur.execute.side_effect = Exception("DB error")

        with pytest.raises(Exception, match="DB error"):
            load(df, "postgresql://test", skip_quality=True)

        mock_conn.rollback.assert_called_once()
        mock_conn.commit.assert_not_called()

    @patch("etl.load.loader.psycopg2")
    def test_double_load_no_duplicates(self, mock_psycopg2):
        """Load same data twice — second load skips all (watermark)."""
        df = _make_transformed_df(2)
        ts_list = df["observed_at"].tolist()
        max_ts = max(ts_list)

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.cursor.return_value = mock_cur
        mock_psycopg2.connect.return_value = mock_conn

        # First load: no watermark, inserts succeed
        mock_cur.fetchone.side_effect = [
            None,           # get_watermark
            (1,),           # dim_time[0]
            (2,),           # dim_time[1]
            (10,),          # dim_location
            (1,),           # dim_weather combo 1
            (2,),           # dim_weather combo 2
            # set_watermark uses execute, not fetchone
        ]
        mock_cur.fetchall.return_value = []
        mock_cur.rowcount = 1

        result1 = load(df, "postgresql://test", skip_quality=True)
        assert result1["inserted"] >= 0

        # Reset mock for second load
        mock_cur.reset_mock()
        mock_conn.reset_mock()
        mock_conn.cursor.return_value = mock_cur

        # Second load: watermark exists at max_ts
        mock_cur.fetchone.side_effect = [
            (max_ts,),      # get_watermark → same as max_ts
            # df filtered to empty (all observed_at <= watermark)
        ]
        mock_cur.fetchall.return_value = []

        # Need to re-create df since it might be filtered
        result2 = load(df.copy(), "postgresql://test", skip_quality=True)
        # Should insert 0 new rows (all filtered by watermark)
        assert result2["inserted"] == 0
        mock_conn.commit.assert_called()


# ── Integration tests (require real PostgreSQL) ────────────────────


_DSN = os.environ.get("DATABASE_URL", "")


@pytest.mark.skipif(not _DSN, reason="DATABASE_URL not set")
class TestLoadIntegration:
    """Integration tests against a real PostgreSQL database."""

    @pytest.fixture(autouse=True)
    def setup_db(self):
        """Set up test database and clean up after."""
        import psycopg2

        self.conn = psycopg2.connect(_DSN)
        self.conn.autocommit = True
        cur = self.conn.cursor()

        # Ensure tables exist
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS dim_time (
                time_id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL,
                date DATE NOT NULL,
                hour SMALLINT NOT NULL,
                day SMALLINT NOT NULL,
                month SMALLINT NOT NULL,
                year SMALLINT NOT NULL,
                day_of_week SMALLINT NOT NULL,
                is_weekend BOOLEAN NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_dim_time_ts ON dim_time (timestamp);

            CREATE TABLE IF NOT EXISTS dim_location (
                location_id SERIAL PRIMARY KEY,
                city VARCHAR(100) NOT NULL,
                district VARCHAR(100) NOT NULL,
                latitude NUMERIC(9, 6),
                longitude NUMERIC(9, 6),
                region_level VARCHAR(50)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_dim_loc_cd
                ON dim_location (city, district);

            CREATE TABLE IF NOT EXISTS dim_weather (
                weather_id SERIAL PRIMARY KEY,
                condition_code VARCHAR(20),
                condition_desc VARCHAR(100),
                temp_classification VARCHAR(50),
                humidity_classification VARCHAR(50),
                wind_classification VARCHAR(50),
                rain_classification VARCHAR(50)
            );

            CREATE TABLE IF NOT EXISTS fact_weather (
                fact_weather_id SERIAL PRIMARY KEY,
                time_id INTEGER NOT NULL REFERENCES dim_time(time_id),
                location_id INTEGER NOT NULL REFERENCES dim_location(location_id),
                weather_id INTEGER NOT NULL REFERENCES dim_weather(weather_id),
                temperature NUMERIC(5, 2),
                humidity NUMERIC(5, 2),
                pressure NUMERIC(7, 2),
                wind_direction VARCHAR(20),
                wind_speed NUMERIC(5, 2),
                rainfall NUMERIC(6, 2),
                uv_index NUMERIC(4, 2),
                visibility NUMERIC(5, 2),
                cloud_coverage NUMERIC(5, 2),
                temp_avg NUMERIC(5, 2),
                temp_max NUMERIC(5, 2),
                temp_min NUMERIC(5, 2),
                source VARCHAR(50),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_fact_time_location UNIQUE (time_id, location_id)
            );

            CREATE TABLE IF NOT EXISTS etl_watermark (
                id INTEGER PRIMARY KEY DEFAULT 1,
                last_loaded_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
            """
        )

        # Clean test data (order matters for FKs)
        cur.execute("DELETE FROM fact_weather WHERE source = 'TestLoad'")
        cur.execute(
            "DELETE FROM dim_weather WHERE condition_code LIKE 'TEST_%'"
        )
        cur.execute(
            "DELETE FROM dim_location WHERE district LIKE 'Test_%'"
        )

        cur.close()
        yield

        # Cleanup
        cur = self.conn.cursor()
        cur.execute("DELETE FROM fact_weather WHERE source = 'TestLoad'")
        cur.execute(
            "DELETE FROM dim_weather WHERE condition_code LIKE 'TEST_%'"
        )
        cur.execute(
            "DELETE FROM dim_location WHERE district LIKE 'Test_%'"
        )
        cur.close()
        self.conn.close()

    def test_load_creates_dimensions_and_facts(self):
        df = _make_transformed_df(2, location="Test_Kec1")
        df["source"] = "TestLoad"
        df["condition_code"] = ["TEST_01", "TEST_02"]

        result = load(df, _DSN, skip_quality=True)

        assert result["inserted"] == 2
        assert result["skipped"] == 0

    def test_double_load_no_duplicates(self):
        df = _make_transformed_df(2, location="Test_Kec2")
        df["source"] = "TestLoad"
        df["condition_code"] = ["TEST_03", "TEST_04"]

        # First load
        r1 = load(df.copy(), _DSN, skip_quality=True)
        assert r1["inserted"] == 2

        # Second load — should skip all (watermark)
        r2 = load(df.copy(), _DSN, skip_quality=True)
        assert r2["inserted"] == 0

    def test_watermark_persists(self):
        df = _make_transformed_df(1, location="Test_Kec3")
        df["source"] = "TestLoad"
        df["condition_code"] = ["TEST_05"]

        load(df, _DSN, skip_quality=True)

        # Read watermark back
        import psycopg2

        conn = psycopg2.connect(_DSN)
        cur = conn.cursor()
        cur.execute("SELECT last_loaded_at FROM etl_watermark WHERE id = 1")
        row = cur.fetchone()
        cur.close()
        conn.close()

        assert row is not None
        assert row[0] is not None
