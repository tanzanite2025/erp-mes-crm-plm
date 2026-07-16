#!/usr/bin/env bash
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TARGET_REMOTE="origin"
TARGET_BRANCH="master"

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
  echo -e "${RED}ERR: Docker Compose v2 is required (docker compose).${NC}"
  exit 1
fi

if [[ ! -f ./server/.env && ! -f ./server/.env.production ]]; then
  echo -e "${RED}ERR: missing server/.env or server/.env.production.${NC}"
  echo -e "${YELLOW}Copy server/.env.production.example to server/.env and replace all placeholders.${NC}"
  exit 1
fi

echo -e "${CYAN}>>> [STAGE 1/4] Hard sync to ${TARGET_REMOTE}/${TARGET_BRANCH}...${NC}"

git fetch --all --prune

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "${TARGET_BRANCH}" ]]; then
  echo -e "${YELLOW}>>> Switching branch: ${CURRENT_BRANCH} -> ${TARGET_BRANCH}${NC}"
  if git show-ref --verify --quiet "refs/heads/${TARGET_BRANCH}"; then
    git checkout "${TARGET_BRANCH}"
  else
    git checkout -b "${TARGET_BRANCH}" "${TARGET_REMOTE}/${TARGET_BRANCH}"
  fi
fi

git reset --hard "${TARGET_REMOTE}/${TARGET_BRANCH}"
chmod +x "$0"

# Keep runtime data and env files used by production services.
git clean -fd \
  -e .env \
  -e .env.local \
  -e .env.production \
  -e .deploy-runtime \
  -e server/.env \
  -e server/.env.production \
  -e server/.env.dev \
  -e server/uploads \
  -e server/backups \
  -e server/postgres_data \
  -e server/redis_data \
  -e server/storage \
  -e server/logs \
  -e uploads \
  -e storage \
  -e logs

echo -e "${CYAN}>>> [STAGE 2/4] Install deps and build frontend...${NC}"
PNPM_CMD=(pnpm)
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    echo -e "${YELLOW}>>> pnpm not found, bootstrapping via corepack (pnpm@10.33.0)...${NC}"
    corepack prepare pnpm@10.33.0 --activate
    PNPM_CMD=(corepack pnpm)
  else
    echo -e "${RED}ERR: pnpm is required for this repository (npm fallback removed).${NC}"
    echo -e "${YELLOW}Install pnpm or enable corepack, then retry deploy.${NC}"
    exit 1
  fi
fi

"${PNPM_CMD[@]}" install --frozen-lockfile
"${PNPM_CMD[@]}" build

echo -e "${CYAN}>>> [STAGE 2.5/4] Publish frontend release atomically...${NC}"
chmod +x ./scripts/publish-frontend-release.sh
./scripts/publish-frontend-release.sh

echo -e "${CYAN}>>> [STAGE 3/4] Run backend deploy script (default app rebuild path)...${NC}"
if [[ -f "./server/deploy-prod.sh" ]]; then
  cd server
  chmod +x deploy-prod.sh
  ./deploy-prod.sh
else
  echo -e "${RED}ERR: missing backend deploy script: ./server/deploy-prod.sh${NC}"
  exit 1
fi

echo -e "${GREEN}>>> [SUCCESS] Deploy completed.${NC}"
echo -e "${YELLOW}Repository is synced to ${TARGET_REMOTE}/${TARGET_BRANCH}.${NC}"
