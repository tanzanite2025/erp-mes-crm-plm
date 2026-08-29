param(
  [Parameter(Mandatory = $true)]
  [string]$SdkRoot,
  [string]$BuildDir = ".\build-windows",
  [string]$OutputDir = ".."
)

$ErrorActionPreference = "Stop"
$nativeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $nativeRoot

if (-not (Test-Path (Join-Path $SdkRoot "incCn\HCISUPCMS.h"))) {
  throw "未找到官方 SDK 头文件: $SdkRoot\incCn\HCISUPCMS.h"
}

$cmakeCommand = (Get-Command cmake -ErrorAction SilentlyContinue)?.Source
if (-not $cmakeCommand) {
  $vsCMake = "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
  if (Test-Path $vsCMake) {
    $cmakeCommand = $vsCMake
  }
}
if (-not $cmakeCommand) {
  throw "未找到 cmake。请安装 CMake 或 Visual Studio Build Tools，并确认 cmake.exe 可用。"
}

& $cmakeCommand -S . -B $BuildDir -A x64 "-DHIKVISION_SDK_ROOT=$SdkRoot"
& $cmakeCommand --build $BuildDir --config Release

$releaseDir = Join-Path $BuildDir "Release"
New-Item -ItemType Directory -Force $OutputDir | Out-Null
Copy-Item (Join-Path $releaseDir "xdfc-isup-sdk-bridge.exe") $OutputDir -Force

$runtimeDir = (Resolve-Path $OutputDir).Path
$sdkLibDir = Join-Path $SdkRoot "lib64"
Get-ChildItem $sdkLibDir -Filter "*.dll" -File | Copy-Item -Destination $runtimeDir -Force
if (Test-Path (Join-Path $sdkLibDir "HCAapSDKCom")) {
  Copy-Item (Join-Path $sdkLibDir "HCAapSDKCom") (Join-Path $runtimeDir "HCAapSDKCom") -Recurse -Force
}

Write-Host "Bridge 构建完成: $(Resolve-Path $OutputDir)"
Write-Host "启动前请确认配置中的 sdkBridgeRuntimeDir 指向 Bridge 输出目录本身。"
