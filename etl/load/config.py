"""Load module configuration."""

import os


def get_dsn() -> str:
    """Return PostgreSQL DSN from environment."""
    return os.environ["DATABASE_URL"]
