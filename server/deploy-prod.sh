#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
  cat <<'EOF'
Usage: ./deploy-prod.sh [--build]

Options:
  --build   Rebuild images before recreating containers.
  -h, --help  Show this help message.
EOF
}

WITH_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --build)
      WITH_BUILD=true
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

COMPOSE_ENV_ARGS=()
if [[ -f ./.env ]]; then
  COMPOSE_ENV_ARGS=(--env-file ./.env)
elif [[ -f ./.env.production ]]; then
  COMPOSE_ENV_ARGS=(--env-file ./.env.production)
else
  echo -e "${YELLOW}>>> [WARN] No server/.env(.production) found; using shell env/defaults.${NC}"
fi

echo -e "${GREEN}>>> [2/6] Start Docker services (db/redis/app/watchdog/nginx_lb)...${NC}"
if [[ "${WITH_BUILD}" == "true" ]]; then
  echo -e "${YELLOW}>>> Build mode: enabled (--build)${NC}"
  docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --build --remove-orphans db redis app watchdog nginx_lb
else
  echo -e "${YELLOW}>>> Build mode: disabled (fast path)${NC}"
  docker compose "${COMPOSE_ENV_ARGS[@]}" up -d --remove-orphans db redis app watchdog nginx_lb
fi

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
