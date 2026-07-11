"""Tests for Phase 7: Backend API Layer (Next.js Route Handlers).

Verifies: route file structure, response format, error handling,
caching, Prisma client setup, TypeScript compilation.
"""

import subprocess
from pathlib import Path

LANDING_DIR = Path(__file__).resolve().parent.parent.parent / "apps" / "landing"
API_DIR = LANDING_DIR / "app" / "api" / "weather"


def _read_route(endpoint: str) -> str:
    return (API_DIR / endpoint / "route.ts").read_text()


# ── Route file structure ───────────────────────────────────────────


class TestRouteFiles:
    """Verify all 4 API route files exist and are valid."""

    ENDPOINTS = ["current", "forecast", "trend", "heatmap"]

    def test_all_route_files_exist(self):
        for ep in self.ENDPOINTS:
            assert (API_DIR / ep / "route.ts").exists(), f"Missing: {ep}"

    def test_all_routes_export_get(self):
        for ep in self.ENDPOINTS:
            source = _read_route(ep)
            assert "export" in source and "GET" in source, f"No GET in {ep}"

    def test_all_routes_have_revalidate(self):
        for ep in self.ENDPOINTS:
            source = _read_route(ep)
            assert "revalidate" in source, f"No revalidate in {ep}"

    def test_all_routes_use_prisma(self):
        for ep in self.ENDPOINTS:
            source = _read_route(ep)
            assert "@/lib/prisma" in source, f"No prisma import in {ep}"

    def test_all_routes_use_raw_sql(self):
        for ep in self.ENDPOINTS:
            source = _read_route(ep)
            assert "$queryRaw" in source, f"No raw SQL in {ep}"


# ── Response format ────────────────────────────────────────────────


class TestResponseFormat:
    """Verify responses follow {data, meta} envelope."""

    def test_current_returns_data_meta(self):
        source = _read_route("current")
        assert "data:" in source
        assert "meta:" in source
        assert "count:" in source

    def test_forecast_groups_by_district(self):
        source = _read_route("forecast")
        assert "grouped" in source
        assert "observations:" in source

    def test_trend_returns_moving_averages(self):
        source = _read_route("trend")
        assert "moving_averages:" in source
        assert "deltas:" in source

    def test_heatmap_returns_coordinates(self):
        source = _read_route("heatmap")
        assert "coordinates:" in source
        assert "latitude" in source
        assert "longitude" in source

    def test_heatmap_returns_metrics(self):
        source = _read_route("heatmap")
        assert "avg_temperature" in source
        assert "avg_rainfall" in source


# ── Error handling ─────────────────────────────────────────────────


class TestErrorHandling:
    """Verify all routes have proper error handling."""

    def test_all_routes_have_try_catch(self):
        for ep in ["current", "forecast", "trend", "heatmap"]:
            source = _read_route(ep)
            assert "try" in source and "catch" in source

    def test_all_routes_return_404_on_empty(self):
        for ep in ["current", "forecast", "trend", "heatmap"]:
            source = _read_route(ep)
            assert "404" in source, f"No 404 in {ep}"

    def test_all_routes_return_500_on_error(self):
        for ep in ["current", "forecast", "trend", "heatmap"]:
            source = _read_route(ep)
            assert "500" in source, f"No 500 in {ep}"

    def test_error_responses_have_code_field(self):
        for ep in ["current", "forecast", "trend", "heatmap"]:
            source = _read_route(ep)
            assert "code:" in source, f"No error code in {ep}"


# ── Caching ────────────────────────────────────────────────────────


class TestCaching:
    """Verify routes use revalidate for caching."""

    def test_revalidate_set_to_600(self):
        """10 minutes = 600 seconds (matches ETL scheduler interval)."""
        for ep in ["current", "forecast", "trend", "heatmap"]:
            source = _read_route(ep)
            assert "600" in source, f"revalidate != 600 in {ep}"


# ── Query parameters ───────────────────────────────────────────────


class TestQueryParams:
    """Verify routes accept documented query parameters."""

    def test_current_supports_district_filter(self):
        source = _read_route("current")
        assert "district" in source and "searchParams" in source

    def test_forecast_supports_limit(self):
        source = _read_route("forecast")
        assert "limit" in source

    def test_forecast_supports_district(self):
        source = _read_route("forecast")
        assert "district" in source

    def test_trend_supports_limit(self):
        source = _read_route("trend")
        assert "limit" in source

    def test_heatmap_supports_hours(self):
        source = _read_route("heatmap")
        assert "hours" in source


# ── SQL quality ────────────────────────────────────────────────────


class TestSQLQueries:
    """Verify SQL queries use star schema correctly."""

    def test_current_joins_all_dim_tables(self):
        source = _read_route("current")
        assert "fact_weather" in source
        assert "dim_time" in source
        assert "dim_location" in source
        assert "dim_weather" in source

    def test_current_uses_distinct_on(self):
        source = _read_route("current")
        assert "DISTINCT ON" in source

    def test_forecast_uses_window_function(self):
        source = _read_route("forecast")
        assert "ROW_NUMBER()" in source

    def test_trend_uses_window_functions(self):
        source = _read_route("trend")
        assert "AVG" in source
        assert "LAG" in source

    def test_heatmap_aggregates_by_location(self):
        source = _read_route("heatmap")
        assert "GROUP BY" in source


# ── Prisma client ──────────────────────────────────────────────────


class TestPrismaClient:
    """Verify Prisma client singleton setup."""

    LIB_FILE = LANDING_DIR / "lib" / "prisma.ts"

    def test_lib_prisma_exists(self):
        assert self.LIB_FILE.exists()

    def test_uses_adapter_pg(self):
        source = self.LIB_FILE.read_text()
        assert "@prisma/adapter-pg" in source

    def test_caches_globally(self):
        source = self.LIB_FILE.read_text()
        assert "globalForPrisma" in source

    def test_checks_database_url(self):
        source = self.LIB_FILE.read_text()
        assert "DATABASE_URL" in source

    def test_exports_prisma_instance(self):
        source = self.LIB_FILE.read_text()
        assert "export const prisma" in source


# ── TypeScript compilation ─────────────────────────────────────────


class TestTypeScript:
    """Verify TypeScript compiles without errors."""

    def test_tsc_no_errors(self):
        result = subprocess.run(
            ["npx", "tsc", "--noEmit"],
            cwd=str(LANDING_DIR),
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0, f"tsc errors:\n{result.stderr}"
