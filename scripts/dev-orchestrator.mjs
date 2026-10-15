#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  assertLocalDevelopmentPortCanListen,
  createLocalBackendEnvironmentWithConfiguredServicePorts,
  loadLocalDevelopmentEnvironmentAndServicePorts,
} from './local-development-environment-and-service-port-configuration.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')
const serverDir = resolve(repoRoot, 'server')
const viteEntry = resolve(repoRoot, 'node_modules/vite/bin/vite.js')

const prepareOnly = process.argv.includes('--prepare-only')
const backendOnly = process.argv.includes('--backend-only')
const frontendOnly = process.argv.includes('--frontend-only')

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

function cleanGoBuildCache() {
  log('cleaning Go build cache (--clean-go-cache requested)')
  const ok = runOptional('go', ['clean', '-cache'], { cwd: serverDir })
  if (!ok) {
    log(
      'Go cache cleanup failed; continuing. If backend compile fails, check stale Go processes or antivirus locks.'
    )
  }
}

function generateRouteContracts() {
  log(
    'generating route tree, authenticated route catalog, and permission contracts'
  )
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
    console.error(
      `[dev] ${label} exited code=${code ?? 'null'} signal=${signal ?? 'null'}`
    )
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

try {
  if (backendOnly && frontendOnly) {
    throw new Error('Choose either --backend-only or --frontend-only')
  }
  const { environment, ports } =
    loadLocalDevelopmentEnvironmentAndServicePorts()
  const backendEnv = createLocalBackendEnvironmentWithConfiguredServicePorts(
    environment,
    ports
  )
  const frontendUrl = `http://127.0.0.1:${ports.DEV_FRONTEND_PORT}`
  const backendUrl = `http://127.0.0.1:${ports.DEV_BACKEND_PORT}`
  log(`local service ports: ${JSON.stringify(ports)}`)

  if (!prepareOnly && !backendOnly) {
    await assertLocalDevelopmentPortCanListen(
      'DEV_FRONTEND_PORT',
      ports.DEV_FRONTEND_PORT
    )
  }
  if (!prepareOnly && !frontendOnly) {
    await assertLocalDevelopmentPortCanListen(
      'DEV_BACKEND_PORT',
      ports.DEV_BACKEND_PORT
    )
  }
  if (!frontendOnly) {
    if (process.argv.includes('--clean-go-cache')) cleanGoBuildCache()
    log('starting local base services: Postgres / Redis / Search Engine')
    runChecked(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        './server/dev-up.ps1',
      ],
      { cwd: repoRoot, env: backendEnv }
    )
  }
  if (!backendOnly) generateRouteContracts()

  if (prepareOnly) {
    log('DEV prepare complete: base services running, contracts generated')
    process.exit(0)
  }

  if (!frontendOnly) {
    startChild(`backend API ${backendUrl}`, 'go', ['run', 'main.go'], {
      cwd: serverDir,
      env: backendEnv,
    })
  }
  if (!backendOnly) {
    startChild(
      `frontend Vite ${frontendUrl}`,
      process.execPath,
      [
        viteEntry,
        '--host',
        '127.0.0.1',
        '--port',
        String(ports.DEV_FRONTEND_PORT),
        '--strictPort',
      ],
      {
        cwd: repoRoot,
        env: { ...environment, VITE_PROXY_TARGET: backendUrl },
      }
    )
  }
  log(
    `DEV processes launched. ${backendOnly ? 'API' : 'Frontend'}: ${backendOnly ? backendUrl : frontendUrl}`
  )
  if (!backendOnly) {
    log(
      `Frontend API proxy: ${backendUrl}; waiting for backend startup to finish`
    )
  }
} catch (error) {
  console.error('[dev] failed to start dev processes:', error)
  shutdown(1)
}
