#!/usr/bin/env bash
set -euo pipefail
backup_dir=${1:?Usage: bash scripts/ops/restore.sh /absolute/backup-directory --confirm-empty-target}
[[ "${2:-}" = '--confirm-empty-target' && "$backup_dir" = /* ]] || { echo 'Restore requires an absolute path and --confirm-empty-target.' >&2; exit 1; }
(cd "$backup_dir" && sha256sum --check SHA256SUMS)
running_services=$(docker compose ps --status running --services)
if grep -Eq '^(web|worker)$' <<<"$running_services"; then
  echo 'Stop web and worker before restoring.' >&2; exit 1
fi
count=$(bash scripts/ops/postgres-client.sh psql --no-psqlrc -Atc "SELECT count(*) FROM pg_tables WHERE schemaname !~ '^pg_' AND schemaname<>'information_schema'")
[[ "$count" = 0 ]] || { echo 'Refusing to restore into a nonempty database. Use a fresh isolated target.' >&2; exit 1; }
docker compose run --rm --no-deps -T --entrypoint node web -e 'if(process.env.S3_BUCKET)process.exit(1)'
docker compose run --rm --no-deps -T --entrypoint sh web -c 'test -z "$(ls -A /app/uploads)"' || { echo 'Upload volume must be empty.' >&2; exit 1; }
bash scripts/ops/postgres-client.sh pg_restore --no-owner --no-privileges --exit-on-error --single-transaction < "$backup_dir/database.dump"
docker compose run --rm --no-deps -T --entrypoint tar web --no-same-owner -C /app/uploads -xf - < "$backup_dir/uploads.tar"
echo 'Restore complete. Run migrations, start services, and verify health, sign-in and photos before switching traffic.'
