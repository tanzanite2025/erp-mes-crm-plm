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
  -e server/storage \
  -e server/logs \
  -e uploads \
  -e storage \
  -e logs

echo -e "${CYAN}>>> [STAGE 2/4] Install deps and build frontend...${NC}"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm build
else
  echo -e "${YELLOW}Warning: pnpm not found, fallback to npm.${NC}"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build
fi

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
