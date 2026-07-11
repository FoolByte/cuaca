#!/bin/bash
# Creates the airflow_metadata database if it doesn't exist.
# Runs automatically on first PostgreSQL startup via docker-entrypoint-initdb.d.

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE airflow_metadata'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'airflow_metadata')\gexec
EOSQL
