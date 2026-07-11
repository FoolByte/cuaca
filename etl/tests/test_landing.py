"""Tests for Phase 8: Landing Page.

Verifies: page files exist, SEO metadata, responsive components,
API integration, sitemap, robots.txt.
"""

import subprocess
from pathlib import Path

LANDING_DIR = Path(__file__).resolve().parent.parent.parent / "apps" / "landing"
APP_DIR = LANDING_DIR / "app"
COMP_DIR = APP_DIR / "components"


# ── Page files ─────────────────────────────────────────────────────


class TestPages:
    """Verify all 7 pages exist."""

    PAGES = [
        ("page.tsx", "Home"),
        ("cuaca/page.tsx", "Current Weather"),
        ("forecast/page.tsx", "Forecast"),
        ("trend/page.tsx", "Trend"),
        ("heatmap/page.tsx", "Heatmap"),
        ("tentang/page.tsx", "About"),
        ("kontak/page.tsx", "Contact"),
    ]

    def test_all_pages_exist(self):
        for file, name in self.PAGES:
            assert (APP_DIR / file).exists(), f"Missing page: {name}"

    def test_pages_are_not_empty(self):
        for file, name in self.PAGES:
            content = (APP_DIR / file).read_text()
            assert len(content.strip()) > 50, f"Empty page: {name}"


# ── Components ─────────────────────────────────────────────────────


class TestComponents:
    """Verify shared components exist."""

    def test_navbar_exists(self):
        assert (COMP_DIR / "Navbar.tsx").exists()

    def test_footer_exists(self):
        assert (COMP_DIR / "Footer.tsx").exists()

    def test_weather_card_exists(self):
        assert (COMP_DIR / "WeatherCard.tsx").exists()

    def test_leaflet_map_exists(self):
        assert (COMP_DIR / "LeafletMap.tsx").exists()

    def test_navbar_is_client_component(self):
        source = (COMP_DIR / "Navbar.tsx").read_text()
        assert '"use client"' in source

    def test_footer_has_navigation_links(self):
        source = (COMP_DIR / "Footer.tsx").read_text()
        assert "/cuaca" in source
        assert "/forecast" in source
        assert "/trend" in source
        assert "/heatmap" in source


# ── SEO ────────────────────────────────────────────────────────────


class TestSEO:
    """Verify SEO metadata and files."""

    def test_sitemap_exists(self):
        assert (APP_DIR / "sitemap.ts").exists()

    def test_robots_exists(self):
        assert (APP_DIR / "robots.ts").exists()

    def test_sitemap_lists_all_pages(self):
        source = (APP_DIR / "sitemap.ts").read_text()
        assert "/cuaca" in source
        assert "/forecast" in source
        assert "/trend" in source
        assert "/heatmap" in source
        assert "/tentang" in source
        assert "/kontak" in source

    def test_robots_disallows_api(self):
        source = (APP_DIR / "robots.ts").read_text()
        assert "/api/" in source
        assert "disallow" in source.lower()

    def test_layout_has_default_metadata(self):
        source = (APP_DIR / "layout.tsx").read_text()
        assert "metadata" in source
        assert "Cuaca Medan" in source

    def test_layout_has_open_graph(self):
        source = (APP_DIR / "layout.tsx").read_text()
        assert "openGraph" in source

    def test_layout_has_title_template(self):
        source = (APP_DIR / "layout.tsx").read_text()
        assert "template" in source

    def test_pages_have_metadata_exports(self):
        """Each page should export its own metadata."""
        pages_with_metadata = [
            "page.tsx",
            "cuaca/page.tsx",
            "forecast/page.tsx",
            "trend/page.tsx",
            "heatmap/page.tsx",
            "tentang/page.tsx",
            "kontak/page.tsx",
        ]
        for page in pages_with_metadata:
            source = (APP_DIR / page).read_text()
            assert "Metadata" in source, f"No metadata in {page}"

    def test_lang_is_indonesian(self):
        source = (APP_DIR / "layout.tsx").read_text()
        assert 'lang="id"' in source


# ── Responsive ─────────────────────────────────────────────────────


class TestResponsive:
    """Verify responsive design patterns."""

    def test_navbar_has_mobile_menu(self):
        source = (COMP_DIR / "Navbar.tsx").read_text()
        assert "md:hidden" in source or "md:flex" in source

    def test_navbar_has_hamburger_button(self):
        source = (COMP_DIR / "Navbar.tsx").read_text()
        assert "md:hidden" in source

    def test_home_uses_responsive_grid(self):
        source = (APP_DIR / "page.tsx").read_text()
        assert "sm:grid-cols" in source or "lg:grid-cols" in source

    def test_cuaca_uses_responsive_grid(self):
        source = (APP_DIR / "cuaca/page.tsx").read_text()
        assert "sm:grid-cols" in source or "lg:grid-cols" in source

    def test_forecast_table_responsive(self):
        source = (APP_DIR / "forecast/page.tsx").read_text()
        assert "overflow-x-auto" in source

    def test_trend_table_responsive(self):
        source = (APP_DIR / "trend/page.tsx").read_text()
        assert "overflow-x-auto" in source


# ── API integration ────────────────────────────────────────────────


class TestAPIIntegration:
    """Verify pages consume API from Phase 7."""

    API_FILE = LANDING_DIR / "lib" / "api.ts"

    def test_api_helper_exists(self):
        assert self.API_FILE.exists()

    def test_api_exports_all_fetchers(self):
        source = self.API_FILE.read_text()
        assert "getCurrentWeather" in source
        assert "getForecast" in source
        assert "getTrend" in source
        assert "getHeatmap" in source

    def test_api_types_defined(self):
        source = self.API_FILE.read_text()
        assert "CurrentWeatherData" in source
        assert "ForecastData" in source
        assert "TrendData" in source
        assert "HeatmapData" in source

    def test_home_fetches_current_weather(self):
        source = (APP_DIR / "page.tsx").read_text()
        assert "getCurrentWeather" in source

    def test_cuaca_fetches_current_weather(self):
        source = (APP_DIR / "cuaca/page.tsx").read_text()
        assert "getCurrentWeather" in source

    def test_forecast_fetches_forecast(self):
        source = (APP_DIR / "forecast/page.tsx").read_text()
        assert "getForecast" in source

    def test_trend_fetches_trend(self):
        source = (APP_DIR / "trend/page.tsx").read_text()
        assert "getTrend" in source

    def test_heatmap_fetches_heatmap(self):
        source = (APP_DIR / "heatmap/page.tsx").read_text()
        assert "getHeatmap" in source

    def test_api_has_revalidate_cache(self):
        source = self.API_FILE.read_text()
        assert "revalidate" in source


# ── Layout ─────────────────────────────────────────────────────────


class TestLayout:
    """Verify root layout includes Navbar and Footer."""

    def test_layout_imports_navbar(self):
        source = (APP_DIR / "layout.tsx").read_text()
        assert "Navbar" in source

    def test_layout_imports_footer(self):
        source = (APP_DIR / "layout.tsx").read_text()
        assert "Footer" in source

    def test_layout_has_main_tag(self):
        source = (APP_DIR / "layout.tsx").read_text()
        assert "<main" in source


# ── TypeScript ─────────────────────────────────────────────────────


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
        assert result.returncode == 0, f"tsc errors:\n{result.stdout}"
