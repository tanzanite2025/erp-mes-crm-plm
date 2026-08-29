#!/usr/bin/env sh
set -eu

SDK_ROOT=${1:?用法: ./build-linux.sh /path/to/official/isup-sdk}
BUILD_DIR=${2:-./build-linux}
OUTPUT_DIR=${3:-..}

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

test -f "$SDK_ROOT/incCn/HCISUPCMS.h"
cmake -S . -B "$BUILD_DIR" -DHIKVISION_SDK_ROOT="$SDK_ROOT" -DCMAKE_BUILD_TYPE=Release
cmake --build "$BUILD_DIR" --config Release

mkdir -p "$OUTPUT_DIR/vendor/lib64"
cp "$BUILD_DIR/xdfc-isup-sdk-bridge" "$OUTPUT_DIR/"
if [ -d "$SDK_ROOT/lib64" ]; then
  cp -a "$SDK_ROOT/lib64/." "$OUTPUT_DIR/vendor/lib64/"
else
  mkdir -p "$OUTPUT_DIR/vendor/lib"
  cp -a "$SDK_ROOT/lib/." "$OUTPUT_DIR/vendor/lib/"
fi

echo "Bridge 构建完成: $OUTPUT_DIR"
echo "启动前请确认 sdkBridgeRuntimeDir 指向 vendor/lib64 或 vendor/lib。"
