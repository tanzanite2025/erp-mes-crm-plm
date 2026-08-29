#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"

if [ ! -f "./config/config.json" ]; then
  cp "./config/config.example.json" "./config/config.json"
  echo "已生成配置文件 ./config/config.json"
  echo "请填写 ERP 地址、ISUP Key、ERP 入站令牌后重新运行此脚本。"
  exit 0
fi

mkdir -p ./runtime/queue ./runtime/dead-letter ./runtime/sdk-log ./sdk-bridge

if [ "${1:-}" = "--build" ]; then
  docker compose build
fi

docker compose up -d
docker compose ps
echo "ISUP Gateway 已启动。健康检查: http://127.0.0.1:9090/healthz"
