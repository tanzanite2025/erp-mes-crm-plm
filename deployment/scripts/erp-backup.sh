#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/opt/backups/erp}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DRILL_RETENTION_DAYS="${DRILL_RETENTION_DAYS:-30}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-erp-db-1}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-erp-uploads}"
STORAGE_VOLUME="${STORAGE_VOLUME:-erp-storage}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:15-alpine}"
ALPINE_IMAGE="${ALPINE_IMAGE:-alpine:3.20}"
LOCK_FILE="${LOCK_FILE:-/var/lock/erp-backup.lock}"
RESTORE_CLEANUP_CONTAINER=""
RESTORE_CLEANUP_VOLUME=""
RESTORE_CLEANUP_UPLOADS_EXTRACT=""
RESTORE_CLEANUP_STORAGE_EXTRACT=""

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

usage() {
  cat <<'USAGE'
Usage:
  erp-backup.sh backup
  erp-backup.sh restore-drill [latest|YYYYMMDDTHHMMSSZ]

Environment overrides:
  BACKUP_ROOT=/opt/backups/erp
  RETENTION_DAYS=14
  POSTGRES_CONTAINER=erp-db-1
  UPLOADS_VOLUME=erp-uploads
  STORAGE_VOLUME=erp-storage
USAGE
}

require_commands() {
  for command_name in docker sha256sum stat tar find awk; do
    if ! command -v "${command_name}" >/dev/null 2>&1; then
      log "missing required command: ${command_name}"
      exit 1
    fi
  done
}

ensure_dirs() {
  mkdir -p \
    "${BACKUP_ROOT}/postgres" \
    "${BACKUP_ROOT}/uploads" \
    "${BACKUP_ROOT}/storage" \
    "${BACKUP_ROOT}/restore-drills"
  chmod 700 \
    "${BACKUP_ROOT}" \
    "${BACKUP_ROOT}/postgres" \
    "${BACKUP_ROOT}/uploads" \
    "${BACKUP_ROOT}/storage" \
    "${BACKUP_ROOT}/restore-drills"
}

restore_cleanup() {
  if [[ -n "${RESTORE_CLEANUP_CONTAINER}" ]]; then
    docker rm -f "${RESTORE_CLEANUP_CONTAINER}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${RESTORE_CLEANUP_VOLUME}" ]]; then
    docker volume rm "${RESTORE_CLEANUP_VOLUME}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${RESTORE_CLEANUP_UPLOADS_EXTRACT}" ]]; then
    rm -rf "${RESTORE_CLEANUP_UPLOADS_EXTRACT}"
  fi
  if [[ -n "${RESTORE_CLEANUP_STORAGE_EXTRACT}" ]]; then
    rm -rf "${RESTORE_CLEANUP_STORAGE_EXTRACT}"
  fi
}

archive_volume() {
  local volume_name="$1"
  local target_dir="$2"
  local target_name="$3"
  local container_name="$4"
  local target_path="${target_dir}/${target_name}"
  local temp_name="${target_name}.tmp"

  docker run --rm --name "${container_name}" \
    -v "${volume_name}:/data:ro" \
    -v "${target_dir}:/backup" \
    "${ALPINE_IMAGE}" sh -ec "cd /data && tar -czf /backup/${temp_name} ."

  mv "${target_path}.tmp" "${target_path}"
  chmod 600 "${target_path}"
  sha256sum "${target_path}" > "${target_path}.sha256"
  chmod 600 "${target_path}.sha256"
}

rotate_backups() {
  find "${BACKUP_ROOT}/postgres" -type f \
    \( -name 'postgres-*.dump' -o -name 'postgres-*.dump.sha256' -o -name 'postgres-*.dump.list' \) \
    -mtime "+${RETENTION_DAYS}" -delete

  find "${BACKUP_ROOT}/uploads" -type f \
    \( -name 'uploads-*.tgz' -o -name 'uploads-*.tgz.sha256' \) \
    -mtime "+${RETENTION_DAYS}" -delete

  find "${BACKUP_ROOT}/storage" -type f \
    \( -name 'storage-*.tgz' -o -name 'storage-*.tgz.sha256' \) \
    -mtime "+${RETENTION_DAYS}" -delete

  find "${BACKUP_ROOT}/restore-drills" -mindepth 1 -maxdepth 1 -type d \
    -mtime "+${DRILL_RETENTION_DAYS}" -exec rm -rf -- {} +
}

run_backup() {
  umask 077
  require_commands
  ensure_dirs

  local timestamp
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  local safe_timestamp="${timestamp//[^0-9A-Za-z]/}"
  local pg_dir="${BACKUP_ROOT}/postgres"
  local uploads_dir="${BACKUP_ROOT}/uploads"
  local storage_dir="${BACKUP_ROOT}/storage"
  local pg_dump="${pg_dir}/postgres-${timestamp}.dump"

  log "dumping PostgreSQL from ${POSTGRES_CONTAINER}"
  docker exec "${POSTGRES_CONTAINER}" sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "${pg_dump}.tmp"
  mv "${pg_dump}.tmp" "${pg_dump}"
  chmod 600 "${pg_dump}"
  sha256sum "${pg_dump}" > "${pg_dump}.sha256"
  chmod 600 "${pg_dump}.sha256"

  log "validating PostgreSQL dump catalog"
  docker run --rm \
    -v "${pg_dir}:/backup:ro" \
    "${POSTGRES_IMAGE}" pg_restore -l "/backup/$(basename "${pg_dump}")" > "${pg_dump}.list"
  chmod 600 "${pg_dump}.list"

  log "archiving ${UPLOADS_VOLUME}"
  archive_volume \
    "${UPLOADS_VOLUME}" \
    "${uploads_dir}" \
    "uploads-${timestamp}.tgz" \
    "erp-backup-uploads-${safe_timestamp}"

  log "archiving ${STORAGE_VOLUME}"
  archive_volume \
    "${STORAGE_VOLUME}" \
    "${storage_dir}" \
    "storage-${timestamp}.tgz" \
    "erp-backup-storage-${safe_timestamp}"

  rotate_backups

  log "backup complete: ${timestamp}"
  printf 'timestamp=%s\npostgres_dump=%s\nuploads_archive=%s\nstorage_archive=%s\n' \
    "${timestamp}" \
    "${pg_dump}" \
    "${uploads_dir}/uploads-${timestamp}.tgz" \
    "${storage_dir}/storage-${timestamp}.tgz"
}

resolve_timestamp() {
  local requested="${1:-latest}"
  if [[ "${requested}" != "latest" ]]; then
    printf '%s\n' "${requested}"
    return
  fi

  local latest_dump
  latest_dump="$(find "${BACKUP_ROOT}/postgres" -maxdepth 1 -type f -name 'postgres-*.dump' | sort | tail -n 1)"
  if [[ -z "${latest_dump}" ]]; then
    log "no PostgreSQL dump found under ${BACKUP_ROOT}/postgres"
    exit 1
  fi

  basename "${latest_dump}" | sed -E 's/^postgres-(.+)\.dump$/\1/'
}

run_restore_drill() {
  umask 077
  require_commands
  ensure_dirs

  local timestamp
  timestamp="$(resolve_timestamp "${1:-latest}")"
  local safe_timestamp="${timestamp//[^0-9A-Za-z]/}"
  local pg_dir="${BACKUP_ROOT}/postgres"
  local uploads_dir="${BACKUP_ROOT}/uploads"
  local storage_dir="${BACKUP_ROOT}/storage"
  local drill_dir="${BACKUP_ROOT}/restore-drills/${timestamp}"
  local pg_dump="${pg_dir}/postgres-${timestamp}.dump"
  local uploads_tar="${uploads_dir}/uploads-${timestamp}.tgz"
  local storage_tar="${storage_dir}/storage-${timestamp}.tgz"
  local manifest="${drill_dir}/manifest.txt"
  local restore_container="erp-restore-drill-pg-${safe_timestamp}"
  local restore_volume="erp-restore-drill-pg-${safe_timestamp}"

  for required_file in "${pg_dump}" "${uploads_tar}" "${storage_tar}"; do
    if [[ ! -f "${required_file}" ]]; then
      log "missing restore input: ${required_file}"
      exit 1
    fi
  done

  mkdir -p "${drill_dir}"
  chmod 700 "${drill_dir}"

  RESTORE_CLEANUP_CONTAINER="${restore_container}"
  RESTORE_CLEANUP_VOLUME="${restore_volume}"
  RESTORE_CLEANUP_UPLOADS_EXTRACT="${drill_dir}/uploads-extract"
  RESTORE_CLEANUP_STORAGE_EXTRACT="${drill_dir}/storage-extract"
  trap restore_cleanup EXIT

  log "starting temporary PostgreSQL restore container ${restore_container}"
  docker volume create "${restore_volume}" >/dev/null
  docker run -d --name "${restore_container}" \
    -e POSTGRES_PASSWORD=restore \
    -e POSTGRES_USER=restore \
    -e POSTGRES_DB=restore \
    -v "${restore_volume}:/var/lib/postgresql/data" \
    -v "${pg_dir}:/backup:ro" \
    "${POSTGRES_IMAGE}" >/dev/null

  local ready=0
  for _ in $(seq 1 60); do
    if docker exec "${restore_container}" pg_isready -h 127.0.0.1 -U restore -d postgres >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done

  if [[ "${ready}" != 1 ]]; then
    docker logs "${restore_container}" > "${drill_dir}/postgres-startup.log" 2>&1 || true
    log "temporary PostgreSQL did not become ready"
    exit 1
  fi

  docker exec "${restore_container}" createdb -h 127.0.0.1 -U restore restore >/dev/null 2>&1 || true

  log "restoring PostgreSQL dump ${pg_dump}"
  docker exec "${restore_container}" pg_restore \
    -h 127.0.0.1 \
    --exit-on-error \
    --no-owner \
    --role=restore \
    -U restore \
    -d restore \
    "/backup/$(basename "${pg_dump}")" > "${drill_dir}/pg_restore.log" 2>&1

  local table_count
  local db_size
  table_count="$(docker exec "${restore_container}" psql -h 127.0.0.1 -U restore -d restore -Atc "select count(*) from information_schema.tables where table_schema = 'public';")"
  db_size="$(docker exec "${restore_container}" psql -h 127.0.0.1 -U restore -d restore -Atc "select pg_database_size('restore');")"

  log "extracting file archives for verification"
  mkdir -p "${drill_dir}/uploads-extract" "${drill_dir}/storage-extract"
  tar -xzf "${uploads_tar}" -C "${drill_dir}/uploads-extract"
  tar -xzf "${storage_tar}" -C "${drill_dir}/storage-extract"

  local upload_files
  local upload_bytes
  local storage_files
  local storage_bytes
  upload_files="$(find "${drill_dir}/uploads-extract" -type f | wc -l | tr -d ' ')"
  upload_bytes="$(du -sb "${drill_dir}/uploads-extract" | awk '{print $1}')"
  storage_files="$(find "${drill_dir}/storage-extract" -type f | wc -l | tr -d ' ')"
  storage_bytes="$(du -sb "${drill_dir}/storage-extract" | awk '{print $1}')"

  {
    printf 'timestamp_utc=%s\n' "${timestamp}"
    printf 'postgres_dump=%s\n' "${pg_dump}"
    printf 'postgres_dump_bytes=%s\n' "$(stat -c%s "${pg_dump}")"
    printf 'postgres_restore_table_count=%s\n' "${table_count}"
    printf 'postgres_restore_db_bytes=%s\n' "${db_size}"
    printf 'uploads_archive=%s\n' "${uploads_tar}"
    printf 'uploads_archive_bytes=%s\n' "$(stat -c%s "${uploads_tar}")"
    printf 'uploads_restore_file_count=%s\n' "${upload_files}"
    printf 'uploads_restore_bytes=%s\n' "${upload_bytes}"
    printf 'storage_archive=%s\n' "${storage_tar}"
    printf 'storage_archive_bytes=%s\n' "$(stat -c%s "${storage_tar}")"
    printf 'storage_restore_file_count=%s\n' "${storage_files}"
    printf 'storage_restore_bytes=%s\n' "${storage_bytes}"
    printf 'postgres_sha256=%s\n' "$(cut -d ' ' -f1 "${pg_dump}.sha256")"
    printf 'uploads_sha256=%s\n' "$(cut -d ' ' -f1 "${uploads_tar}.sha256")"
    printf 'storage_sha256=%s\n' "$(cut -d ' ' -f1 "${storage_tar}.sha256")"
  } > "${manifest}"
  chmod 600 "${manifest}" "${drill_dir}/pg_restore.log"

  log "restore drill complete: ${timestamp}"
  printf 'timestamp=%s\npostgres_restore_table_count=%s\npostgres_restore_db_bytes=%s\nuploads_restore_file_count=%s\nstorage_restore_file_count=%s\nmanifest=%s\n' \
    "${timestamp}" \
    "${table_count}" \
    "${db_size}" \
    "${upload_files}" \
    "${storage_files}" \
    "${manifest}"
}

main() {
  local action="${1:-backup}"

  require_commands
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    log "another ERP backup process is already running"
    exit 75
  fi

  case "${action}" in
    backup)
      run_backup
      ;;
    restore-drill)
      shift || true
      run_restore_drill "${1:-latest}"
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
}

main "$@"
