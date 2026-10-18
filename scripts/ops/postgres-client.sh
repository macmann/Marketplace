#!/usr/bin/env bash
# Use host clients or clients in an existing shared PostgreSQL resource.
# This helper never starts a PostgreSQL container or changes a database itself.
set -euo pipefail
: "${DATABASE_URL:?Export DATABASE_URL securely for the backup/restore process}"
tool=${1:?Expected pg_dump, pg_restore, or psql}
shift
case "$tool" in pg_dump|pg_restore|psql) ;; *) echo 'Unsupported PostgreSQL tool.' >&2; exit 1 ;; esac
if [[ -n "${POSTGRES_CLIENT_CONTAINER:-}" ]]; then
  export DATABASE_URL
  exec docker exec -i -e DATABASE_URL "$POSTGRES_CLIENT_CONTAINER" sh -c 'tool=$1; shift; exec "$tool" --dbname="$DATABASE_URL" "$@"' sh "$tool" "$@"
fi
command -v "$tool" >/dev/null || { echo "Install matching PostgreSQL clients, or set POSTGRES_CLIENT_CONTAINER to the existing shared database container." >&2; exit 1; }
exec "$tool" --dbname="$DATABASE_URL" "$@"
