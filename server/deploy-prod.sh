#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
echo "[INFO] server/deploy-prod.sh is a compatibility entrypoint."
exec ./deploy.sh "$@"
