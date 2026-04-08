#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
  cat <<'EOF'
Usage: ./deploy-prod.sh [--full-build] [--watchdog-build] [--no-build]

Options:
  --full-build      Rebuild app, search-engine and watchdog before recreating containers.
  --watchdog-build  Rebuild watchdog explicitly.
  --no-build        Skip image rebuild and use fast path.
  -h, --help  Show this help message.
EOF
}

load_deploy_env() {
  if [[ -f ./.env ]]; then
    DEPLOY_ENV_FILE="./.env"
    COMPOSE_ENV_ARGS=(--env-file ./.env)
  elif [[ -f ./.env.production ]]; then
    DEPLOY_ENV_FILE="./.env.production"
    COMPOSE_ENV_ARGS=(--env-file ./.env.production)
  else
    DEPLOY_ENV_FILE=""
    COMPOSE_ENV_ARGS=()
    echo -e "${YELLOW}>>> [WARN] No server/.env(.production) found; using shell env/defaults.${NC}"
  fi

  if [[ -n "${DEPLOY_ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${DEPLOY_ENV_FILE}"
    set +a
  fi

  XDFC_APP_UID="${XDFC_APP_UID:-10001}"
  XDFC_APP_GID="${XDFC_APP_GID:-10001}"
}

prepare_app_runtime_dir() {
  local path="$1"
  mkdir -p "${path}"
  chown "${XDFC_APP_UID}:${XDFC_APP_GID}" "${path}"
  chmod 0755 "${path}"
}

BUILD_MODE="app"
for arg in "$@"; do
  case "$arg" in
    --full-build)
      BUILD_MODE="full"
      ;;
    --watchdog-build)
      BUILD_MODE="watchdog"
      ;;
    --no-build)
      BUILD_MODE="none"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo -e "${RED}[ERROR] Unknown argument: ${arg}${NC}"
      usage
      exit 1
      ;;
  esac
done

cd "$(dirname "$0")"

load_deploy_env

echo -e "${GREEN}>>> [1/6] Ensure runtime directories...${NC}"
mkdir -p ./uploads ./backups ./postgres_data

# Backward compatibility: if legacy /var/www/erp/uploads has data and new path is empty,
# copy once into /var/www/erp/server/uploads to avoid file-access regression after path switch.
if [[ -d ../uploads ]]; then
  if find ../uploads -mindepth 1 -print -quit | grep -q .; then
    if ! find ./uploads -mindepth 1 -print -quit | grep -q .; then
      echo -e "${YELLOW}>>> Detected legacy uploads data, migrating into server/uploads...${NC}"
      cp -a ../uploads/. ./uploads/
    fi
  fi
fi

prepare_app_runtime_dir ./uploads
prepare_app_runtime_dir ./backups

DEFAULT_SERVICES=(db redis search-engine app nginx_lb)
FULL_BUILD_SERVICES=(db redis search-engine app watchdog nginx_lb)

echo -e "${GREEN}>>> [2/6] Start Docker services...${NC}"
case "${BUILD_MODE}" in
  app)
    echo -e "${YELLOW}>>> Build mode: enabled (default app rebuild path)${NC}"
    docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --remove-orphans db redis nginx_lb
    docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --build search-engine app
    ;;
  full)
    echo -e "${YELLOW}>>> Build mode: enabled (--full-build path: search-engine + app + watchdog)${NC}"
    docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --build --remove-orphans "${FULL_BUILD_SERVICES[@]}"
    ;;
  watchdog)
    echo -e "${YELLOW}>>> Build mode: enabled (--watchdog-build path)${NC}"
    docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --remove-orphans "${DEFAULT_SERVICES[@]}"
    docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --build watchdog
    ;;
  none)
    echo -e "${YELLOW}>>> Build mode: disabled (--no-build fast path)${NC}"
    docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --remove-orphans "${DEFAULT_SERVICES[@]}"
    ;;
esac

echo -e "${GREEN}>>> [3/6] Prune dangling images...${NC}"
docker image prune -f

echo -e "${GREEN}>>> [4/6] Verify SSL certificates...${NC}"
if [[ ! -f "/etc/nginx/ssl/xdfc_origin.crt" || ! -f "/etc/nginx/ssl/xdfc_origin.key" ]]; then
  echo -e "${RED}[ERROR] Missing SSL cert/key in /etc/nginx/ssl/${NC}"
  echo -e "Expected: /etc/nginx/ssl/xdfc_origin.crt and /etc/nginx/ssl/xdfc_origin.key"
  exit 1
fi

echo -e "${GREEN}>>> [5/6] Sync Nginx site config...${NC}"
cp ./deployment/nginx/erp.tanzanite.site.conf /etc/nginx/sites-available/xdfc_erp
ln -sf /etc/nginx/sites-available/xdfc_erp /etc/nginx/sites-enabled/xdfc_erp

echo -e "${GREEN}>>> [6/6] Validate & reload Nginx...${NC}"
if nginx -t; then
  systemctl reload nginx
  echo -e "${GREEN}>>> [SUCCESS] Production deploy done: https://erp.tanzanite.site${NC}"
else
  echo -e "${RED}[ERROR] Nginx config test failed, reload aborted.${NC}"
  exit 1
fi

echo "--------------------------------------------------------"
echo "Docker status:"
docker compose "${COMPOSE_ENV_ARGS[@]}" ps
echo "--------------------------------------------------------"
