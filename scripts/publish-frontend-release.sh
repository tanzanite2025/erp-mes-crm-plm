#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIST="${ROOT_DIR}/dist"
FRONTEND_RUNTIME_DIR="${FRONTEND_RUNTIME_DIR:-${ROOT_DIR}/.deploy-runtime/frontend}"
RELEASES_DIR="${FRONTEND_RUNTIME_DIR}/releases"
CURRENT_LINK="${FRONTEND_RUNTIME_DIR}/current"
NEXT_LINK="${FRONTEND_RUNTIME_DIR}/current.next"
SHARED_DIR="${FRONTEND_RUNTIME_DIR}/shared"
SHARED_ASSETS_DIR="${SHARED_DIR}/assets"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
RELEASE_ID="$(date +%Y%m%d%H%M%S)"
STAGING_RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"

if [[ ! -d "${SOURCE_DIST}" ]]; then
  echo "[publish-frontend-release] missing dist directory: ${SOURCE_DIST}" >&2
  exit 1
fi

mkdir -p "${RELEASES_DIR}" "${SHARED_ASSETS_DIR}" "${STAGING_RELEASE_DIR}"

cp -a "${SOURCE_DIST}/." "${STAGING_RELEASE_DIR}/"

if [[ -d "${SOURCE_DIST}/assets" ]]; then
  cp -a "${SOURCE_DIST}/assets/." "${SHARED_ASSETS_DIR}/"
fi

printf '%s\n' "${RELEASE_ID}" > "${STAGING_RELEASE_DIR}/RELEASE_ID"

ln -sfn "${STAGING_RELEASE_DIR}" "${NEXT_LINK}"
mv -Tf "${NEXT_LINK}" "${CURRENT_LINK}"

if [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  mapfile -t OLD_RELEASES < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +"$((KEEP_RELEASES + 1))")
  if (( ${#OLD_RELEASES[@]} > 0 )); then
    rm -rf "${OLD_RELEASES[@]}"
  fi
fi

echo "[publish-frontend-release] current release -> ${STAGING_RELEASE_DIR}"
