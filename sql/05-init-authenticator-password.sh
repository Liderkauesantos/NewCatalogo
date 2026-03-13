#!/bin/bash
# This script runs after SQL init files to set the authenticator password
# from the environment variable. It's mounted into docker-entrypoint-initdb.d/
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER ROLE authenticator WITH PASSWORD '${AUTHENTICATOR_PASSWORD}';
    ALTER DATABASE ${POSTGRES_DB} SET "app.jwt_secret" TO '${JWT_SECRET}';
EOSQL
