#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${ENV_FILE:-/etc/erp-backup-r2.env}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/backups/erp}"
RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/var/cache/restic/erp-r2}"
RESTIC_HOST="${RESTIC_HOST:-$(hostname -s)-erp}"
RESTIC_TAGS="${RESTIC_TAGS:-erp,prod,hostinger}"
RESTIC_KEEP_DAILY="${RESTIC_KEEP_DAILY:-14}"
RESTIC_KEEP_WEEKLY="${RESTIC_KEEP_WEEKLY:-8}"
RESTIC_KEEP_MONTHLY="${RESTIC_KEEP_MONTHLY:-6}"
RESTIC_CHECK_READ_DATA_SUBSET="${RESTIC_CHECK_READ_DATA_SUBSET:-1/20}"
RESTIC_RESTORE_DRILL_ROOT="${RESTIC_RESTORE_DRILL_ROOT:-/opt/backups/erp-r2-restore-drills}"
LOCK_FILE="${LOCK_FILE:-/var/lock/erp-r2-sync.lock}"

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

usage() {
  cat <<'USAGE'
Usage:
  erp-r2-sync.sh init
  erp-r2-sync.sh sync
  erp-r2-sync.sh check
  erp-r2-sync.sh snapshots
  erp-r2-sync.sh restore-drill [latest]

Required root-only env file:
  /etc/erp-backup-r2.env

The env file must define:
  RESTIC_REPOSITORY
  RESTIC_PASSWORD
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
USAGE
}

require_commands() {
  for command_name in restic flock find hostname date; do
    if ! command -v "${command_name}" >/dev/null 2>&1; then
      log "missing required command: ${command_name}"
      exit 1
    fi
  done
}

load_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    log "missing ${ENV_FILE}; copy deployment/scripts/erp-r2.env.example and fill it on the VPS"
    exit 1
  fi

  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a

  for required_var in RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
    if [[ -z "${!required_var:-}" || "${!required_var}" == *"<"* || "${!required_var}" == *"CHANGE_ME"* ]]; then
      log "${required_var} is missing or still contains a placeholder"
      exit 1
    fi
  done

  export RESTIC_CACHE_DIR
  mkdir -p "${RESTIC_CACHE_DIR}" "${RESTIC_RESTORE_DRILL_ROOT}"
  chmod 700 "${RESTIC_CACHE_DIR}" "${RESTIC_RESTORE_DRILL_ROOT}"
}

restic_tag_args() {
  local tags_csv="${RESTIC_TAGS}"
  local tag
  IFS=',' read -ra tags <<< "${tags_csv}"
  for tag in "${tags[@]}"; do
    if [[ -n "${tag}" ]]; then
      printf -- '--tag\n%s\n' "${tag}"
    fi
  done
}

restic_repo_exists() {
  restic snapshots >/dev/null 2>&1
}

run_init() {
  if restic_repo_exists; then
    log "restic repository already initialized"
    return
  fi

  log "initializing restic repository ${RESTIC_REPOSITORY}"
  restic init
}

run_sync() {
  if ! restic_repo_exists; then
    log "restic repository is not initialized; run: erp-r2-sync.sh init"
    exit 1
  fi

  local -a tag_args=()
  mapfile -t tag_args < <(restic_tag_args)

  log "uploading ${BACKUP_ROOT} to R2 restic repository"
  restic backup \
    --host "${RESTIC_HOST}" \
    "${tag_args[@]}" \
    "${BACKUP_ROOT}/postgres" \
    "${BACKUP_ROOT}/uploads" \
    "${BACKUP_ROOT}/storage" \
    "${BACKUP_ROOT}/restore-drills"

  log "applying restic retention policy"
  restic forget \
    --host "${RESTIC_HOST}" \
    "${tag_args[@]}" \
    --keep-daily "${RESTIC_KEEP_DAILY}" \
    --keep-weekly "${RESTIC_KEEP_WEEKLY}" \
    --keep-monthly "${RESTIC_KEEP_MONTHLY}" \
    --prune
}

run_check() {
  log "checking restic repository metadata and ${RESTIC_CHECK_READ_DATA_SUBSET} data subset"
  restic check --read-data-subset="${RESTIC_CHECK_READ_DATA_SUBSET}"
}

run_snapshots() {
  restic snapshots
}

run_restore_drill() {
  if [[ ! -x /usr/local/sbin/erp-backup.sh ]]; then
    log "missing /usr/local/sbin/erp-backup.sh; install deployment/scripts/erp-backup.sh first"
    exit 1
  fi

  local requested_snapshot="${1:-latest}"
  local timestamp
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  local target_dir="${RESTIC_RESTORE_DRILL_ROOT}/${timestamp}"
  local restored_backup_root="${target_dir}${BACKUP_ROOT}"

  mkdir -p "${target_dir}"
  chmod 700 "${target_dir}"

  log "restoring ${requested_snapshot} snapshot from R2 into ${target_dir}"
  restic restore "${requested_snapshot}" --target "${target_dir}"

  if [[ ! -d "${restored_backup_root}" ]]; then
    log "restored snapshot did not contain ${BACKUP_ROOT}"
    exit 1
  fi

  log "running local restore drill against restored R2 copy"
  BACKUP_ROOT="${restored_backup_root}" /usr/local/sbin/erp-backup.sh restore-drill latest

  log "R2 restore drill complete: ${target_dir}"
}

main() {
  local action="${1:-sync}"

  require_commands
  load_env

  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    log "another ERP R2 sync process is already running"
    exit 75
  fi

  case "${action}" in
    init)
      run_init
      ;;
    sync)
      run_sync
      ;;
    check)
      run_check
      ;;
    snapshots)
      run_snapshots
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
