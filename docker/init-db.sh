#!/bin/bash
# Creates additional databases and read-only users on first PostgreSQL startup.
# Runs automatically via docker-entrypoint-initdb.d.

set -e

# ── Airflow metadata database ──────────────────────────────────────
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE airflow_metadata'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'airflow_metadata')\gexec
EOSQL

# ── Metabase read-only user ────────────────────────────────────────
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'metabase_ro') THEN
            CREATE ROLE metabase_ro WITH LOGIN PASSWORD 'metabase_ro_pass';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE $POSTGRES_DB TO metabase_ro;
    GRANT USAGE ON SCHEMA public TO metabase_ro;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_ro;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT ON TABLES TO metabase_ro;
EOSQL
