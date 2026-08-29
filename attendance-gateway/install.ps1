param(
  [string]$ConfigFile = ".\config\config.json",
  [switch]$Build
)

$ErrorActionPreference = "Stop"
$gatewayRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $gatewayRoot

if (-not (Test-Path $ConfigFile)) {
  Copy-Item ".\config\config.local.example.json" $ConfigFile
  Write-Host "已生成配置文件: $ConfigFile"
  Write-Host "请先填写 ERP 地址、ISUP Key、ERP 入站令牌，再重新运行本脚本。"
  exit 0
}

New-Item -ItemType Directory -Force ".\runtime\queue" | Out-Null
New-Item -ItemType Directory -Force ".\runtime\dead-letter" | Out-Null
New-Item -ItemType Directory -Force ".\runtime\sdk-log" | Out-Null
New-Item -ItemType Directory -Force ".\sdk-bridge" | Out-Null

if ($Build) {
  docker compose build
}

docker compose up -d
docker compose ps
Write-Host "ISUP Gateway 已启动。健康检查: http://127.0.0.1:9090/healthz"
