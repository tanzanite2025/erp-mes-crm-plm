#!/usr/bin/env bash
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TARGET_REMOTE="origin"
TARGET_BRANCH="master"
COMPOSE_FILE="compose.prod.yml"
ENV_FILE="server/.env"
EDGE_NETWORK="tanzanite-edge"

cd "$(dirname "$0")"
ROOT_DIR="$(pwd)"

echo -e "${YELLOW}>>> [PRE-CHECK] Working directory: ${ROOT_DIR}${NC}"

for required_command in git docker; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo -e "${RED}ERR: required command is not available: ${required_command}${NC}"
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo -e "${RED}ERR: Docker Compose v2 is required.${NC}"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo -e "${RED}ERR: missing ${ENV_FILE}.${NC}"
  echo -e "${YELLOW}Create it from server/.env.production.example and replace every placeholder.${NC}"
  exit 1
fi

if grep -Eq '^[A-Za-z_][A-Za-z0-9_]*=CHANGE_ME' "${ENV_FILE}"; then
  echo -e "${RED}ERR: ${ENV_FILE} still contains CHANGE_ME placeholders.${NC}"
  exit 1
fi

IMAGE_TAG="$(sed -n 's/^IMAGE_TAG=//p' "${ENV_FILE}" | tail -n 1 | tr -d '\r')"
if [[ ! "${IMAGE_TAG}" =~ ^sha-[0-9a-f]{7,40}$ ]]; then
  echo -e "${RED}ERR: IMAGE_TAG must be an immutable sha-* tag.${NC}"
  exit 1
fi

if ! docker network inspect "${EDGE_NETWORK}" >/dev/null 2>&1; then
  echo -e "${RED}ERR: shared edge network ${EDGE_NETWORK} does not exist.${NC}"
  echo -e "${YELLOW}Deploy deployment/gateway/compose.yml before the ERP stack.${NC}"
  exit 1
fi

echo -e "${CYAN}>>> [1/5] Sync repository to ${TARGET_REMOTE}/${TARGET_BRANCH}...${NC}"
git fetch --all --prune

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "${TARGET_BRANCH}" ]]; then
  if git show-ref --verify --quiet "refs/heads/${TARGET_BRANCH}"; then
    git checkout "${TARGET_BRANCH}"
  else
    git checkout -b "${TARGET_BRANCH}" "${TARGET_REMOTE}/${TARGET_BRANCH}"
  fi
fi

git reset --hard "${TARGET_REMOTE}/${TARGET_BRANCH}"
git clean -fd \
  -e .env \
  -e .env.local \
  -e .env.production \
  -e server/.env
chmod +x "$0"

COMPOSE=(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

echo -e "${CYAN}>>> [2/5] Validate production Compose...${NC}"
"${COMPOSE[@]}" config --quiet

echo -e "${CYAN}>>> [3/5] Pull immutable production images...${NC}"
"${COMPOSE[@]}" pull

echo -e "${CYAN}>>> [4/5] Reconcile ERP services...${NC}"
"${COMPOSE[@]}" up -d --remove-orphans

echo -e "${CYAN}>>> [5/5] Report service status...${NC}"
"${COMPOSE[@]}" ps

echo -e "${GREEN}>>> [SUCCESS] ERP stack reconciled.${NC}"
echo -e "${YELLOW}Gateway and DNS are managed separately; this script never modifies them.${NC}"
