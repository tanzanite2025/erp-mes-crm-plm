import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { assertLocalDevelopmentPortCanListen } from './local-development-environment-and-service-port-configuration.mjs'
import {
  acquireLocalDevelopmentStartupLock,
  getLocalDevelopmentBackendExecutablePath,
  inspectLocalDevelopmentProcessIdentity,
  isLocalDevelopmentProcessOwnedByRepository,
  isLocalDevelopmentServiceRegisteredToRun,
  registerLocalDevelopmentServiceProcess,
  restartPreviouslyOwnedLocalDevelopmentServices,
  stopLocalDevelopmentChildProcessTree,
} from './local-development-owned-process-restart-and-startup-lock.mjs'

function createLocalDevelopmentRestartTestRepository(t) {
  const repositoryRoot = mkdtempSync(
    join(tmpdir(), 'local-development-owned-process-restart-')
  )
  mkdirSync(join(repositoryRoot, 'output/local-development-process-state'), {
    recursive: true,
  })
  t.after(() => {
    assert.equal(dirname(resolve(repositoryRoot)), resolve(tmpdir()))
    assert.ok(
      basename(repositoryRoot).startsWith(
        'local-development-owned-process-restart-'
      )
    )
    rmSync(repositoryRoot, { recursive: true, force: true })
  })
  return repositoryRoot
}

function getLocalDevelopmentRestartTestStatePath(repositoryRoot, serviceRole) {
  return join(
    repositoryRoot,
    'output/local-development-process-state',
    `${serviceRole}.json`
  )
}

async function reserveAvailableLocalDevelopmentRestartTestPort() {
  const listener = createServer()
  listener.listen({ host: '127.0.0.1', port: 0 })
  await once(listener, 'listening')
  const { port } = listener.address()
  await new Promise((resolveClosed) => listener.close(resolveClosed))
  return port
}

async function startLocalDevelopmentRestartTestListener(t, port = 0) {
  const child = spawn(
    process.execPath,
    [
      '-e',
      `
    const listener = require('node:net').createServer();
    listener.listen({ host: '127.0.0.1', port: ${Number(port)} }, () => process.send(listener.address().port));
  `,
    ],
    { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true }
  )
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return
    const exited = once(child, 'exit')
    stopLocalDevelopmentChildProcessTree(child)
    await exited
  })
  const [listeningPort] = await once(child, 'message')
  return { child, port: listeningPort }
}

function createLocalDevelopmentRestartTestService(role, port) {
  return {
    role,
    port,
    variableName:
      role === 'frontend' ? 'DEV_FRONTEND_PORT' : 'DEV_BACKEND_PORT',
  }
}

async function registerLocalDevelopmentRestartTestListener(
  repositoryRoot,
  role,
  runToken,
  child
) {
  writeFileSync(
    getLocalDevelopmentRestartTestStatePath(repositoryRoot, role),
    JSON.stringify({
      repositoryRoot,
      serviceRole: role,
      runToken,
      identity: null,
    })
  )
  await registerLocalDevelopmentServiceProcess(
    repositoryRoot,
    role,
    runToken,
    child.pid
  )
}

test(
  'restarting an owned listener releases its port and permits a new process to bind it',
  { timeout: 30000 },
  async (t) => {
    const repositoryRoot = createLocalDevelopmentRestartTestRepository(t)
    const { child, port } = await startLocalDevelopmentRestartTestListener(t)
    await registerLocalDevelopmentRestartTestListener(
      repositoryRoot,
      'frontend',
      'previous-run',
      child
    )
    const startupLock = await acquireLocalDevelopmentStartupLock(repositoryRoot)
    t.after(() => startupLock.release())
    await restartPreviouslyOwnedLocalDevelopmentServices({
      repositoryRoot,
      runToken: startupLock.runToken,
      services: [createLocalDevelopmentRestartTestService('frontend', port)],
      log() {},
    })
    assert.equal(await inspectLocalDevelopmentProcessIdentity(child.pid), null)
    const replacement = await startLocalDevelopmentRestartTestListener(t, port)
    await registerLocalDevelopmentServiceProcess(
      repositoryRoot,
      'frontend',
      startupLock.runToken,
      replacement.child.pid
    )
    assert.equal(
      isLocalDevelopmentServiceRegisteredToRun(
        repositoryRoot,
        'frontend',
        startupLock.runToken
      ),
      true
    )
  }
)

test(
  'a foreign listener prevents the entire restart before any owned sibling is stopped',
  { timeout: 30000 },
  async (t) => {
    const repositoryRoot = createLocalDevelopmentRestartTestRepository(t)
    const frontend = await startLocalDevelopmentRestartTestListener(t)
    const foreignBackend = await startLocalDevelopmentRestartTestListener(t)
    await registerLocalDevelopmentRestartTestListener(
      repositoryRoot,
      'frontend',
      'previous-run',
      frontend.child
    )
    await assert.rejects(
      restartPreviouslyOwnedLocalDevelopmentServices({
        repositoryRoot,
        runToken: randomUUID(),
        services: [
          createLocalDevelopmentRestartTestService('frontend', frontend.port),
          createLocalDevelopmentRestartTestService(
            'backend',
            foreignBackend.port
          ),
        ],
        log() {},
      }),
      /ownership.*could not be verified/
    )
    assert.ok(await inspectLocalDevelopmentProcessIdentity(frontend.child.pid))
    assert.ok(
      await inspectLocalDevelopmentProcessIdentity(foreignBackend.child.pid)
    )
    assert.equal(
      isLocalDevelopmentServiceRegisteredToRun(
        repositoryRoot,
        'frontend',
        'previous-run'
      ),
      true
    )
  }
)

test(
  'a stale PID registration cannot claim a process with a different start time',
  { timeout: 30000 },
  async (t) => {
    const repositoryRoot = createLocalDevelopmentRestartTestRepository(t)
    const { child, port } = await startLocalDevelopmentRestartTestListener(t)
    const identity = await inspectLocalDevelopmentProcessIdentity(child.pid)
    writeFileSync(
      getLocalDevelopmentRestartTestStatePath(repositoryRoot, 'frontend'),
      JSON.stringify({
        repositoryRoot,
        serviceRole: 'frontend',
        runToken: 'stale-run',
        identity: { ...identity, startedAt: 'stale-process-start-time' },
      })
    )
    await assert.rejects(
      restartPreviouslyOwnedLocalDevelopmentServices({
        repositoryRoot,
        runToken: randomUUID(),
        services: [createLocalDevelopmentRestartTestService('frontend', port)],
        log() {},
      }),
      /ownership.*could not be verified/
    )
    assert.ok(await inspectLocalDevelopmentProcessIdentity(child.pid))
  }
)

test(
  'restarting only the frontend preserves the registered backend process',
  { timeout: 30000 },
  async (t) => {
    const repositoryRoot = createLocalDevelopmentRestartTestRepository(t)
    const frontend = await startLocalDevelopmentRestartTestListener(t)
    const backend = await startLocalDevelopmentRestartTestListener(t)
    await registerLocalDevelopmentRestartTestListener(
      repositoryRoot,
      'frontend',
      'previous-run',
      frontend.child
    )
    await registerLocalDevelopmentRestartTestListener(
      repositoryRoot,
      'backend',
      'previous-run',
      backend.child
    )
    await restartPreviouslyOwnedLocalDevelopmentServices({
      repositoryRoot,
      runToken: randomUUID(),
      services: [
        createLocalDevelopmentRestartTestService('frontend', frontend.port),
      ],
      log() {},
    })
    assert.equal(
      await inspectLocalDevelopmentProcessIdentity(frontend.child.pid),
      null
    )
    assert.ok(await inspectLocalDevelopmentProcessIdentity(backend.child.pid))
    assert.equal(
      isLocalDevelopmentServiceRegisteredToRun(
        repositoryRoot,
        'backend',
        'previous-run'
      ),
      true
    )
  }
)

test(
  'changing the configured port still stops the registered process on its old port',
  { timeout: 30000 },
  async (t) => {
    const repositoryRoot = createLocalDevelopmentRestartTestRepository(t)
    const { child, port } = await startLocalDevelopmentRestartTestListener(t)
    const newPort = await reserveAvailableLocalDevelopmentRestartTestPort()
    await registerLocalDevelopmentRestartTestListener(
      repositoryRoot,
      'frontend',
      'previous-run',
      child
    )
    await restartPreviouslyOwnedLocalDevelopmentServices({
      repositoryRoot,
      runToken: randomUUID(),
      services: [createLocalDevelopmentRestartTestService('frontend', newPort)],
      log() {},
    })
    assert.equal(await inspectLocalDevelopmentProcessIdentity(child.pid), null)
    await assertLocalDevelopmentPortCanListen('DEV_FRONTEND_PORT', port)
  }
)

test(
  'a second startup waits for the first startup lock to be released',
  { timeout: 30000 },
  async (t) => {
    const repositoryRoot = createLocalDevelopmentRestartTestRepository(t)
    const firstLock = await acquireLocalDevelopmentStartupLock(repositoryRoot)
    t.after(() => firstLock.release())
    let secondLockAcquired = false
    const secondLockPromise = acquireLocalDevelopmentStartupLock(
      repositoryRoot
    ).then((lock) => {
      secondLockAcquired = true
      return lock
    })
    await delay(1500)
    assert.equal(secondLockAcquired, false)
    assert.equal(
      JSON.parse(
        readFileSync(
          getLocalDevelopmentRestartTestStatePath(
            repositoryRoot,
            'startup-lock'
          ),
          'utf8'
        )
      ).runToken,
      firstLock.runToken
    )
    firstLock.release()
    const secondLock = await secondLockPromise
    t.after(() => secondLock.release())
    assert.notEqual(secondLock.runToken, firstLock.runToken)
  }
)

test(
  'an abandoned startup lock is reclaimed using the previous owner identity',
  { timeout: 30000 },
  async (t) => {
    const repositoryRoot = createLocalDevelopmentRestartTestRepository(t)
    const { child } = await startLocalDevelopmentRestartTestListener(t)
    const identity = await inspectLocalDevelopmentProcessIdentity(child.pid)
    const exited = once(child, 'exit')
    stopLocalDevelopmentChildProcessTree(child)
    await exited
    writeFileSync(
      getLocalDevelopmentRestartTestStatePath(repositoryRoot, 'startup-lock'),
      JSON.stringify({ runToken: 'abandoned-run', identity })
    )
    const startupLock = await acquireLocalDevelopmentStartupLock(repositoryRoot)
    t.after(() => startupLock.release())
    assert.notEqual(startupLock.runToken, 'abandoned-run')
  }
)

test('unregistered process matching requires the exact workspace Vite entry or backend executable', () => {
  const repositoryRoot = join(tmpdir(), 'development-repository-with spaces')
  const viteEntry = join(repositoryRoot, 'node_modules/vite/bin/vite.js')
  assert.equal(
    isLocalDevelopmentProcessOwnedByRepository(
      { commandLine: `node "${viteEntry}" --port 18010` },
      repositoryRoot,
      'frontend'
    ),
    true
  )
  assert.equal(
    isLocalDevelopmentProcessOwnedByRepository(
      { commandLine: `node "${viteEntry}.unrelated" --port 18010` },
      repositoryRoot,
      'frontend'
    ),
    false
  )
  assert.equal(
    isLocalDevelopmentProcessOwnedByRepository(
      { commandLine: 'node other-project/vite.js --port 18010' },
      repositoryRoot,
      'frontend'
    ),
    false
  )
  assert.equal(
    isLocalDevelopmentProcessOwnedByRepository(
      {
        commandLine: 'unknown-backend.exe',
        executablePath:
          getLocalDevelopmentBackendExecutablePath(repositoryRoot),
      },
      repositoryRoot,
      'backend'
    ),
    true
  )
  assert.equal(
    isLocalDevelopmentProcessOwnedByRepository(
      { commandLine: 'go run main.go', executablePath: '' },
      repositoryRoot,
      'backend'
    ),
    false
  )
})
