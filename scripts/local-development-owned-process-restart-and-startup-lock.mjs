import { execFile, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { promisify } from 'node:util'
import { assertLocalDevelopmentPortCanListen } from './local-development-environment-and-service-port-configuration.mjs'

const executeDevelopmentProcessInspection = promisify(execFile)

export function getLocalDevelopmentBackendExecutablePath(repositoryRoot) {
  return join(
    resolve(repositoryRoot),
    'server',
    'tmp',
    `local-development-backend-api-server${process.platform === 'win32' ? '.exe' : ''}`
  )
}

function getLocalDevelopmentProcessStatePath(repositoryRoot, serviceRole) {
  return join(
    resolve(repositoryRoot),
    'output',
    'local-development-process-state',
    `${serviceRole}.json`
  )
}

function readLocalDevelopmentProcessState(statePath) {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw new Error(`Cannot read development process state: ${statePath}`, {
      cause: error,
    })
  }
}

function writeLocalDevelopmentProcessStateAtomically(statePath, state) {
  const temporaryStatePath = `${statePath}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporaryStatePath, JSON.stringify(state), { mode: 0o600 })
    renameSync(temporaryStatePath, statePath)
  } finally {
    try {
      unlinkSync(temporaryStatePath)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
}

async function executeLocalDevelopmentWindowsProcessInspection(script) {
  const { stdout } = await executeDevelopmentProcessInspection(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(
        '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false);\n' +
          script,
        'utf16le'
      ).toString('base64'),
    ],
    { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 }
  )
  return stdout.trim() ? JSON.parse(stdout.replace(/^\uFEFF/, '')) : null
}

export async function inspectLocalDevelopmentProcessIdentity(processId) {
  if (!Number.isSafeInteger(processId) || processId < 1) return null
  if (process.platform === 'win32') {
    return executeLocalDevelopmentWindowsProcessInspection(`
      $runtimeProcess = Get-CimInstance Win32_Process -Filter 'ProcessId = ${processId}'
      if ($runtimeProcess) {
        [pscustomobject]@{
          processId = [int]$runtimeProcess.ProcessId
          executablePath = [string]$runtimeProcess.ExecutablePath
          commandLine = [string]$runtimeProcess.CommandLine
          startedAt = $runtimeProcess.CreationDate.ToUniversalTime().ToString('o')
        } | ConvertTo-Json -Compress
      }
    `)
  }
  try {
    const { stdout } = await executeDevelopmentProcessInspection('ps', [
      '-p',
      String(processId),
      '-o',
      'lstart=',
      '-o',
      'args=',
    ])
    const processDescription = stdout.trim()
    if (!processDescription) return null
    return {
      processId,
      startedAt: processDescription.slice(0, 24),
      commandLine: processDescription.slice(24).trim(),
    }
  } catch (error) {
    if (error.code === 1) return null
    throw error
  }
}

function areLocalDevelopmentProcessIdentitiesEqual(left, right) {
  return Boolean(
    left &&
    right &&
    left.processId === right.processId &&
    left.startedAt === right.startedAt &&
    left.commandLine === right.commandLine
  )
}

async function listLocalDevelopmentPortListenerIdentities(port) {
  let processIds
  if (process.platform === 'win32') {
    processIds =
      (await executeLocalDevelopmentWindowsProcessInspection(`
      $runtimeListenerIds = @(Get-NetTCPConnection -State Listen -LocalPort ${Number(port)} -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique)
      ConvertTo-Json -InputObject $runtimeListenerIds -Compress
    `)) ?? []
  } else {
    try {
      const { stdout } = await executeDevelopmentProcessInspection('lsof', [
        '-nP',
        `-iTCP:${port}`,
        '-sTCP:LISTEN',
        '-t',
      ])
      processIds = stdout.trim().split(/\s+/).map(Number)
    } catch (error) {
      if (error.code === 1) return []
      throw new Error(
        'Cannot identify the occupied development port; install lsof or stop its listener manually.',
        { cause: error }
      )
    }
  }
  const identities = await Promise.all(
    processIds.map(inspectLocalDevelopmentProcessIdentity)
  )
  return identities.filter(Boolean)
}

function normalizeLocalDevelopmentProcessPath(value) {
  const normalized = value.replaceAll('\\', '/')
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

export function isLocalDevelopmentProcessOwnedByRepository(
  identity,
  repositoryRoot,
  serviceRole
) {
  if (!identity) return false
  const executablePath = normalizeLocalDevelopmentProcessPath(
    getLocalDevelopmentBackendExecutablePath(repositoryRoot)
  )
  if (serviceRole === 'backend') {
    return (
      normalizeLocalDevelopmentProcessPath(identity.executablePath ?? '') ===
        executablePath ||
      normalizeLocalDevelopmentProcessPath(identity.commandLine) ===
        executablePath ||
      normalizeLocalDevelopmentProcessPath(identity.commandLine) ===
        `"${executablePath}"`
    )
  }
  const viteEntry = normalizeLocalDevelopmentProcessPath(
    join(resolve(repositoryRoot), 'node_modules/vite/bin/vite.js')
  )
  const commandLine = ` ${normalizeLocalDevelopmentProcessPath(identity.commandLine)} `
  return (
    commandLine.includes(` "${viteEntry}" `) ||
    commandLine.includes(` ${viteEntry} `)
  )
}

export function isLocalDevelopmentServiceRegisteredToRun(
  repositoryRoot,
  serviceRole,
  runToken
) {
  return (
    readLocalDevelopmentProcessState(
      getLocalDevelopmentProcessStatePath(repositoryRoot, serviceRole)
    )?.runToken === runToken
  )
}

export function removeLocalDevelopmentServiceRegistration(
  repositoryRoot,
  serviceRole,
  runToken
) {
  if (
    isLocalDevelopmentServiceRegisteredToRun(
      repositoryRoot,
      serviceRole,
      runToken
    )
  ) {
    unlinkSync(getLocalDevelopmentProcessStatePath(repositoryRoot, serviceRole))
  }
}

export async function registerLocalDevelopmentServiceProcess(
  repositoryRoot,
  serviceRole,
  runToken,
  processId
) {
  const identity = await inspectLocalDevelopmentProcessIdentity(processId)
  if (!identity)
    throw new Error(
      `${serviceRole} exited before its development process could be registered`
    )
  if (
    !isLocalDevelopmentServiceRegisteredToRun(
      repositoryRoot,
      serviceRole,
      runToken
    )
  ) {
    throw new Error(
      `${serviceRole} development process ownership changed during startup`
    )
  }
  writeLocalDevelopmentProcessStateAtomically(
    getLocalDevelopmentProcessStatePath(repositoryRoot, serviceRole),
    {
      repositoryRoot: resolve(repositoryRoot),
      serviceRole,
      runToken,
      identity,
    }
  )
}

async function stopVerifiedLocalDevelopmentProcess(identity) {
  if (identity.processId === process.pid)
    throw new Error('Refusing to stop the current development launcher')
  if (
    !areLocalDevelopmentProcessIdentitiesEqual(
      identity,
      await inspectLocalDevelopmentProcessIdentity(identity.processId)
    )
  )
    return
  if (process.platform === 'win32') {
    try {
      await executeDevelopmentProcessInspection(
        'taskkill.exe',
        ['/PID', String(identity.processId), '/T', '/F'],
        { windowsHide: true }
      )
    } catch (error) {
      if (
        areLocalDevelopmentProcessIdentitiesEqual(
          identity,
          await inspectLocalDevelopmentProcessIdentity(identity.processId)
        )
      )
        throw error
    }
  } else {
    process.kill(identity.processId, 'SIGTERM')
  }
  let deadline = Date.now() + 5000
  let forceKillSent = false
  while (
    areLocalDevelopmentProcessIdentitiesEqual(
      identity,
      await inspectLocalDevelopmentProcessIdentity(identity.processId)
    )
  ) {
    if (Date.now() >= deadline) {
      if (process.platform !== 'win32' && !forceKillSent) {
        process.kill(identity.processId, 'SIGKILL')
        forceKillSent = true
        deadline = Date.now() + 2000
      } else
        throw new Error(
          `Development process PID ${identity.processId} did not stop`
        )
    }
    await delay(100)
  }
}

export async function acquireLocalDevelopmentStartupLock(repositoryRoot) {
  const lockPath = getLocalDevelopmentProcessStatePath(
    repositoryRoot,
    'startup-lock'
  )
  mkdirSync(dirname(lockPath), { recursive: true })
  const runToken = randomUUID()
  const identity = await inspectLocalDevelopmentProcessIdentity(process.pid)
  const deadline = Date.now() + 60000
  while (true) {
    try {
      const descriptor = openSync(lockPath, 'wx')
      try {
        writeFileSync(descriptor, JSON.stringify({ runToken, identity }))
      } finally {
        closeSync(descriptor)
      }
      return {
        runToken,
        release() {
          if (readLocalDevelopmentProcessState(lockPath)?.runToken === runToken)
            unlinkSync(lockPath)
        },
      }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
    }
    // A just-created lock can briefly be empty while its owner writes the identity.
    let owner
    try {
      owner = readLocalDevelopmentProcessState(lockPath)
    } catch {
      await delay(100)
      owner = readLocalDevelopmentProcessState(lockPath)
    }
    if (
      owner?.identity &&
      !areLocalDevelopmentProcessIdentitiesEqual(
        owner.identity,
        await inspectLocalDevelopmentProcessIdentity(owner.identity.processId)
      )
    ) {
      if (
        readLocalDevelopmentProcessState(lockPath)?.runToken === owner.runToken
      )
        unlinkSync(lockPath)
      continue
    }
    if (Date.now() >= deadline)
      throw new Error(
        'Another development startup is still running; wait for it to finish and retry.'
      )
    await delay(250)
  }
}

export async function restartPreviouslyOwnedLocalDevelopmentServices({
  repositoryRoot,
  services,
  runToken,
  log = console.log,
}) {
  const verifiedProcesses = new Map()
  // Validate every occupied application port before stopping any service.
  for (const service of services) {
    const state = readLocalDevelopmentProcessState(
      getLocalDevelopmentProcessStatePath(repositoryRoot, service.role)
    )
    const registeredIdentity =
      typeof state?.repositoryRoot === 'string' &&
      normalizeLocalDevelopmentProcessPath(state.repositoryRoot) ===
        normalizeLocalDevelopmentProcessPath(resolve(repositoryRoot)) &&
      state?.serviceRole === service.role
        ? state.identity
        : null
    const currentIdentity = registeredIdentity
      ? await inspectLocalDevelopmentProcessIdentity(
          registeredIdentity.processId
        )
      : null
    const verifiedRegisteredIdentity =
      areLocalDevelopmentProcessIdentitiesEqual(
        registeredIdentity,
        currentIdentity
      )
        ? currentIdentity
        : null
    if (verifiedRegisteredIdentity)
      verifiedProcesses.set(currentIdentity.processId, currentIdentity)
    for (const listener of await listLocalDevelopmentPortListenerIdentities(
      service.port
    )) {
      if (
        !areLocalDevelopmentProcessIdentitiesEqual(
          listener,
          verifiedRegisteredIdentity
        ) &&
        !isLocalDevelopmentProcessOwnedByRepository(
          listener,
          repositoryRoot,
          service.role
        )
      ) {
        throw new Error(
          `${service.variableName}=${service.port} is occupied by PID ${listener.processId}, whose ownership by this repository could not be verified. Stop that process manually or choose another ${service.variableName} in server/.env.dev.`
        )
      }
      verifiedProcesses.set(listener.processId, listener)
    }
  }
  // Publish ownership transfer before stopping old children, so their launcher can
  // keep an unselected sibling service (dev:frontend / dev:server) running.
  for (const service of services) {
    writeLocalDevelopmentProcessStateAtomically(
      getLocalDevelopmentProcessStatePath(repositoryRoot, service.role),
      {
        repositoryRoot: resolve(repositoryRoot),
        serviceRole: service.role,
        runToken,
        identity: null,
      }
    )
  }
  for (const identity of verifiedProcesses.values()) {
    log(
      `stopping previous project development process PID ${identity.processId}`
    )
    await stopVerifiedLocalDevelopmentProcess(identity)
  }
  for (const service of services)
    await assertLocalDevelopmentPortCanListen(
      service.variableName,
      service.port
    )
}

export function stopLocalDevelopmentChildProcessTree(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  } else {
    child.kill('SIGTERM')
  }
}
