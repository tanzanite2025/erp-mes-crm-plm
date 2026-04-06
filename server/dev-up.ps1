param(
    [switch]$ResetDb
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $scriptDir "docker-compose.yml"
$envExampleFile = Join-Path $scriptDir ".env.dev.example"
$envFile = Join-Path $scriptDir ".env.dev"
$dbDataDir = Join-Path $scriptDir "postgres_data"

function Write-Step {
    param([string]$Message)
    Write-Host "[DEV-UP] $Message" -ForegroundColor Cyan
}

function Read-DotEnv {
    param([string]$Path)

    $map = @{}
    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith("#")) {
            return
        }

        $idx = $line.IndexOf("=")
        if ($idx -lt 1) {
            return
        }

        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()
        $map[$key] = $value
    }

    return $map
}

function Invoke-Compose {
    param([string[]]$ComposeArgs)
    & docker compose --env-file $envFile -f $composeFile @ComposeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed: $($ComposeArgs -join ' ')"
    }
}

function Wait-DbHealthy {
    param([int]$TimeoutSeconds = 120)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        $status = (& docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" xdfc-postgres 2>$null).Trim()
        if ($status -eq "healthy") {
            return
        }
        Start-Sleep -Seconds 2
    }

    throw "Postgres did not become healthy in ${TimeoutSeconds}s."
}

function Test-DbCredentials {
    param(
        [string]$PgUser,
        [string]$PgPassword,
        [string]$PgDb
    )

    # Use service DNS host to match real app->db connection path (not container-local trust rules).
    $checkCmd = "PGPASSWORD='$PgPassword' psql -h db -U '$PgUser' -d '$PgDb' -tAc 'select 1'"
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = (& docker exec xdfc-postgres sh -lc $checkCmd 2>$null)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $oldEap
    }

    if ($exitCode -ne 0) {
        return $false
    }

    return ($output -join "`n").Trim() -eq "1"
}

function Reset-LocalDbVolume {
    Write-Step "Resetting local postgres_data for clean dev credentials..."
    Invoke-Compose @("down", "--remove-orphans")

    $resolvedDbDataDir = [System.IO.Path]::GetFullPath($dbDataDir)
    $resolvedScriptDir = [System.IO.Path]::GetFullPath($scriptDir)
    if (-not $resolvedDbDataDir.StartsWith($resolvedScriptDir, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Safety check failed: postgres_data path is outside server directory."
    }

    if (Test-Path -LiteralPath $dbDataDir) {
        Remove-Item -LiteralPath $dbDataDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $dbDataDir | Out-Null
}

if (-not (Test-Path -LiteralPath $envFile)) {
    if (-not (Test-Path -LiteralPath $envExampleFile)) {
        throw "Missing template: $envExampleFile"
    }
    Copy-Item -LiteralPath $envExampleFile -Destination $envFile
    Write-Step "Created $envFile from template. Please review credentials for your local machine."
}

$envMap = Read-DotEnv -Path $envFile
$requiredKeys = @(
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "DATABASE_URL",
    "REDIS_PASSWORD",
    "REDIS_URL",
    "JWT_SECRET",
    "INITIAL_ADMIN_PASSWORD",
    "TOPOLOGY_AUTH_PASSWORD",
    "ALERT_WEBHOOK_TOKEN",
    "ALLOWED_ORIGIN",
    "GIN_MODE",
    "EXCHANGERATE_API_KEY"
)

foreach ($key in $requiredKeys) {
    if (-not $envMap.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envMap[$key])) {
        throw "Missing required key in ${envFile}: $key"
    }
}

# Force compose interpolation to use local dev values from .env.dev.
foreach ($pair in $envMap.GetEnumerator()) {
    Set-Item -Path ("Env:" + $pair.Key) -Value $pair.Value
}

Write-Step "Starting db + redis with local-only dev env..."
Invoke-Compose @("up", "-d", "db", "redis")
Wait-DbHealthy

$pgUser = $envMap["POSTGRES_USER"]
$pgPassword = $envMap["POSTGRES_PASSWORD"]
$pgDb = $envMap["POSTGRES_DB"]

if (-not (Test-DbCredentials -PgUser $pgUser -PgPassword $pgPassword -PgDb $pgDb)) {
    if (-not $ResetDb) {
        Write-Host "[DEV-UP] DB credential mismatch detected in existing local postgres_data." -ForegroundColor Yellow
        Write-Host "[DEV-UP] To rebuild local DB data and avoid restart loops, run:" -ForegroundColor Yellow
        Write-Host "  powershell -ExecutionPolicy Bypass -File .\server\dev-up.ps1 -ResetDb" -ForegroundColor Yellow
        exit 1
    }

    Reset-LocalDbVolume
    Write-Step "Recreating db + redis after reset..."
    Invoke-Compose @("up", "-d", "db", "redis")
    Wait-DbHealthy

    if (-not (Test-DbCredentials -PgUser $pgUser -PgPassword $pgPassword -PgDb $pgDb)) {
        throw "DB credential test still failed after reset. Please verify $envFile."
    }
}

Write-Step "Starting app + nginx_lb + watchdog..."
Invoke-Compose @("up", "-d", "--build", "app", "nginx_lb", "watchdog")

Write-Step "Done. Local stack is ready."
Write-Host "  API/LB: http://localhost:8080"
Write-Host "  Postgres: localhost:5432 (container: xdfc-postgres)"
Write-Host "  Redis: localhost:16379 (container: xdfc-redis)"
Write-Host ""
Invoke-Compose @("ps")
