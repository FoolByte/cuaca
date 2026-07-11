"""Tests for Phase 6: Dashboard Analytics (Metabase).

Verifies: SQL views syntax, docker-compose structure, init-db config,
dashboard documentation completeness.
"""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DOCKER_DIR = PROJECT_ROOT / "docker"
DB_SCHEMA_DIR = PROJECT_ROOT / "database" / "schema"
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"


# ── SQL views ──────────────────────────────────────────────────────


class TestDashboardViews:
    """Verify the dashboard SQL views file."""

    VIEWS_FILE = DB_SCHEMA_DIR / "005_dashboard_views.sql"

    def test_views_file_exists(self):
        assert self.VIEWS_FILE.exists()

    def test_views_file_is_not_empty(self):
        content = self.VIEWS_FILE.read_text()
        assert len(content.strip()) > 0

    def test_has_overview_view(self):
        content = self.VIEWS_FILE.read_text()
        assert "vw_dashboard_overview" in content

    def test_has_analytics_view(self):
        content = self.VIEWS_FILE.read_text()
        assert "vw_dashboard_analytics" in content

    def test_has_trend_view(self):
        content = self.VIEWS_FILE.read_text()
        assert "vw_dashboard_trend" in content

    def test_has_heatmap_view(self):
        content = self.VIEWS_FILE.read_text()
        assert "vw_dashboard_heatmap" in content

    def test_has_prediction_view(self):
        content = self.VIEWS_FILE.read_text()
        assert "vw_dashboard_prediction" in content

    def test_has_anomaly_view(self):
        content = self.VIEWS_FILE.read_text()
        assert "vw_dashboard_anomaly" in content

    def test_six_views_total(self):
        content = self.VIEWS_FILE.read_text()
        view_count = content.lower().count("create or replace view")
        assert view_count == 6

    def test_views_use_star_schema_tables(self):
        """Views should query fact_weather and dim tables."""
        content = self.VIEWS_FILE.read_text()
        assert "fact_weather" in content
        assert "dim_time" in content
        assert "dim_location" in content
        assert "dim_weather" in content

    def test_overview_has_location_coordinates(self):
        """Overview view includes lat/lon for map rendering."""
        content = self.VIEWS_FILE.read_text()
        assert "latitude" in content
        assert "longitude" in content

    def test_trend_has_moving_average(self):
        """Trend view computes moving averages."""
        content = self.VIEWS_FILE.read_text()
        assert "temp_ma_3h" in content or "AVG" in content

    def test_anomaly_has_zscore(self):
        """Anomaly view uses z-score detection."""
        content = self.VIEWS_FILE.read_text()
        assert "z_score" in content
        assert "is_anomaly" in content

    def test_anomaly_requires_minimum_data(self):
        """Anomaly view requires at least 2 data points."""
        content = self.VIEWS_FILE.read_text()
        assert "n >= 2" in content or ">= 2" in content


# ── Docker Compose ─────────────────────────────────────────────────


class TestDockerComposeMetabase:
    """Verify docker-compose.yml includes Metabase."""

    COMPOSE_FILE = DOCKER_DIR / "docker-compose.yml"

    def test_has_metabase_service(self):
        content = self.COMPOSE_FILE.read_text()
        assert "metabase:" in content

    def test_metabase_exposes_port_3000(self):
        content = self.COMPOSE_FILE.read_text()
        assert "3000" in content

    def test_metabase_depends_on_postgres(self):
        content = self.COMPOSE_FILE.read_text()
        assert "depends_on:" in content

    def test_metabase_has_healthcheck(self):
        content = self.COMPOSE_FILE.read_text()
        # Count healthchecks — should have at least 3 (postgres, airflow, metabase)
        assert content.count("healthcheck:") >= 3


# ── Init DB ────────────────────────────────────────────────────────


class TestInitDb:
    """Verify init-db.sh creates read-only user for Metabase."""

    INIT_FILE = DOCKER_DIR / "init-db.sh"

    def test_creates_metabase_ro_user(self):
        content = self.INIT_FILE.read_text()
        assert "metabase_ro" in content

    def test_grants_select_only(self):
        content = self.INIT_FILE.read_text()
        assert "GRANT SELECT" in content

    def test_no_write_grants(self):
        content = self.INIT_FILE.read_text()
        assert "GRANT INSERT" not in content
        assert "GRANT UPDATE" not in content
        assert "GRANT DELETE" not in content

    def test_creates_airflow_metadata_db(self):
        content = self.INIT_FILE.read_text()
        assert "airflow_metadata" in content


# ── Dashboard docs ─────────────────────────────────────────────────


class TestDashboardDocs:
    """Verify dashboard documentation."""

    README_FILE = DASHBOARD_DIR / "README.md"

    def test_readme_exists(self):
        assert self.README_FILE.exists()

    def test_readme_describes_all_sections(self):
        content = self.README_FILE.read_text()
        assert "Overview" in content
        assert "Analytics" in content
        assert "Trend" in content
        assert "Heatmap" in content
        assert "Prediction" in content
        assert "Anomaly" in content

    def test_readme_has_connection_info(self):
        content = self.README_FILE.read_text()
        assert "metabase_ro" in content

    def test_readme_mentions_read_only(self):
        content = self.README_FILE.read_text()
        assert "read-only" in content.lower()
