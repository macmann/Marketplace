#!/usr/bin/env bash
set -euo pipefail
backup_dir=${1:?Usage: bash scripts/ops/restore.sh /absolute/backup-directory --confirm-empty-target}
[[ "${2:-}" = '--confirm-empty-target' && "$backup_dir" = /* ]] || { echo 'Restore requires an absolute path and --confirm-empty-target.' >&2; exit 1; }
(cd "$backup_dir" && sha256sum --check SHA256SUMS)
if docker compose ps --status running --services | grep -Eq '^(web|worker)$'; then
  echo 'Stop web and worker before restoring.' >&2; exit 1
fi
count=$(docker compose exec -T postgres psql -U marketplace -d marketplace -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
[[ "$count" = 0 ]] || { echo 'Refusing to restore into a nonempty database. Use a fresh isolated target.' >&2; exit 1; }
docker compose run --rm --no-deps -T --entrypoint node web -e 'if(process.env.S3_BUCKET)process.exit(1)'
docker compose run --rm --no-deps -T --entrypoint sh web -c 'test -z "$(ls -A /app/uploads)"' || { echo 'Upload volume must be empty.' >&2; exit 1; }
docker compose exec -T postgres pg_restore -U marketplace -d marketplace --exit-on-error --single-transaction < "$backup_dir/database.dump"
docker compose run --rm --no-deps -T --entrypoint tar web --no-same-owner -C /app/uploads -xf - < "$backup_dir/uploads.tar"
echo 'Restore complete. Run migrations, start services, and verify health, sign-in and photos before switching traffic.'
