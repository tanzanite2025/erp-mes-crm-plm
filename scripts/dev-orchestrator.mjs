#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')
const serverDir = resolve(repoRoot, 'server')
const viteEntry = resolve(repoRoot, 'node_modules/vite/bin/vite.js')

const devPorts = [8010, 8020]
const frontendPort = '8010'
const backendPort = '8020'
const backendOrigin =
  'http://localhost:8010,http://127.0.0.1:8010,http://localhost:8020,http://127.0.0.1:8020'
const prepareOnly = process.argv.includes('--prepare-only')

const children = new Set()
let shuttingDown = false

function log(message) {
  console.log(`[dev] ${message}`)
}

function runChecked(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runOptional(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  })
  return result.status === 0
}

function clearWindowsPortConflicts() {
  const portLiteral = devPorts.join(', ')
  const script = `
$ports = @(${portLiteral})
$selfPid = $PID
$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $ports -contains $_.LocalPort }
$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($processId in $processIds) {
  if (-not $processId -or $processId -eq $selfPid) { continue }
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
  $name = if ($processInfo) { $processInfo.Name } else { "unknown" }
  $cmd = if ($processInfo) { $processInfo.CommandLine } else { "" }
  Write-Host "[dev] clear port owner pid=$processId name=$name"
  if ($cmd) { Write-Host "[dev]   $cmd" }
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}
`
  runChecked(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { cwd: repoRoot }
  )
}

function clearUnixPortConflicts() {
  for (const port of devPorts) {
    const result = spawnSync('sh', [
      '-lc',
      `command -v lsof >/dev/null 2>&1 && lsof -tiTCP:${port} -sTCP:LISTEN || true`,
    ])
    const pids = result.stdout
      ?.toString('utf8')
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)

    for (const pid of pids || []) {
      if (pid === String(process.pid)) continue
      log(`clear port ${port} owner pid=${pid}`)
      spawnSync('kill', ['-9', pid], { stdio: 'ignore' })
    }
  }
}

function clearLocalConflicts() {
  log(`clearing local dev port conflicts: ${devPorts.join(', ')}`)
  if (process.platform === 'win32') {
    clearWindowsPortConflicts()
    return
  }
  clearUnixPortConflicts()
}

function cleanGoBuildCache() {
  log('cleaning Go build cache to avoid stale go-build locks')
  const ok = runOptional('go', ['clean', '-cache'], { cwd: serverDir })
  if (!ok) {
    log('Go cache cleanup failed; continuing. If backend compile fails, check stale Go processes or antivirus locks.')
  }
}

function generateRouteContracts() {
  log('generating route tree, authenticated route catalog, and permission contracts')
  runChecked('node', ['scripts/generate-route-tree.mjs'])
  runChecked('node', ['scripts/generate-authenticated-route-catalog.mjs'])
  runChecked('node', ['scripts/generate-route-permission-contract.mjs'])
  runChecked('node', ['scripts/generate-permission-contract.mjs'])
}

function startChild(label, command, args, options = {}) {
  log(`starting ${label}`)
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  })

  children.add(child)
  child.on('error', (error) => {
    children.delete(child)
    if (shuttingDown) return
    console.error(`[dev] failed to start ${label}:`, error)
    shutdown(1)
  })
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (shuttingDown) return
    if (code === 0 || signal) return
    console.error(`[dev] ${label} exited code=${code ?? 'null'} signal=${signal ?? 'null'}`)
    shutdown(code ?? 1)
  })

  return child
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  log('stopping dev processes')

  for (const child of children) {
    if (child.killed) continue
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      })
    } else {
      child.kill('SIGTERM')
    }
  }

  process.exit(exitCode)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

clearLocalConflicts()
cleanGoBuildCache()

log('starting local base services: Postgres / Redis / Search Engine')
runChecked(
  'powershell',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', './server/dev-up.ps1'],
  { cwd: repoRoot }
)

generateRouteContracts()

if (prepareOnly) {
  log('DEV prepare complete: ports cleared, base services running, contracts generated')
  process.exit(0)
}

const backendEnv = {
  ...process.env,
  PORT: backendPort,
  SEARCH_ENGINE_URL: 'http://127.0.0.1:8030',
  ALLOWED_ORIGIN: backendOrigin,
}

const frontendEnv = {
  ...process.env,
  VITE_PROXY_TARGET: `http://localhost:${backendPort}`,
}

try {
  startChild('backend API http://localhost:8020', 'go', ['run', 'main.go'], {
    cwd: serverDir,
    env: backendEnv,
  })

  startChild(
    'frontend Vite http://localhost:8010',
    process.execPath,
    [viteEntry, '--host', '127.0.0.1', '--port', frontendPort],
    {
      cwd: repoRoot,
      env: frontendEnv,
    }
  )
} catch (error) {
  console.error('[dev] failed to start dev processes:', error)
  shutdown(1)
}

log('DEV started. Login: admin / xdfc_local_admin_password')
