#!/usr/bin/env bash
# Run from the repository root with the same Compose project/env as the deployment.
set -euo pipefail
umask 077
backup_dir=${1:?Usage: bash scripts/ops/backup.sh /absolute/new/backup-directory}
[[ "$backup_dir" = /* && ! -e "$backup_dir" && ! -e "$backup_dir.partial" ]] || { echo 'Choose a new absolute directory.' >&2; exit 1; }
if docker compose ps --status running --services | grep -Eq '^(web|worker)$'; then
  echo 'Stop web and worker for a consistent database/media snapshot, then rerun. Restart them after backup.' >&2; exit 1
fi
# The default deployment uses local media. S3 requires a coordinated bucket/version snapshot.
docker compose run --rm --no-deps -T --entrypoint node web -e 'if(process.env.S3_BUCKET){console.error("S3 deployment: use the bucket snapshot runbook instead.");process.exit(1)}'
mkdir -p "$backup_dir.partial"
docker compose exec -T postgres pg_dump -U marketplace -d marketplace --format=custom > "$backup_dir.partial/database.dump"
docker compose run --rm --no-deps -T --entrypoint tar web -C /app/uploads -cf - . > "$backup_dir.partial/uploads.tar"
(cd "$backup_dir.partial" && sha256sum database.dump uploads.tar > SHA256SUMS)
printf '%s\n' '{"format":1,"storage":"local","database":"PostgreSQL 17","consistent":"writers-stopped"}' > "$backup_dir.partial/manifest.json"
mv "$backup_dir.partial" "$backup_dir"
echo 'Backup complete. Encrypt and copy it off-host, then restart web and worker.'
