import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import test from 'node:test'
import {
  assertLocalDevelopmentPortCanListen,
  createLocalBackendEnvironmentWithConfiguredServicePorts,
  loadLocalDevelopmentEnvironmentAndServicePorts,
} from './local-development-environment-and-service-port-configuration.mjs'

test('local service port overrides drive backend connections, CORS, and compose variables together', () => {
  const previousFrontendPort = process.env.DEV_FRONTEND_PORT
  const previousBackendPort = process.env.DEV_BACKEND_PORT
  try {
    process.env.DEV_FRONTEND_PORT = '28010'
    process.env.DEV_BACKEND_PORT = '28020'
    const { environment, ports } =
      loadLocalDevelopmentEnvironmentAndServicePorts()
    const backendEnvironment =
      createLocalBackendEnvironmentWithConfiguredServicePorts(
        {
          ...environment,
          DATABASE_URL:
            'postgres://employee:p%40ss%3Aword@db:5432/salary?sslmode=disable',
          REDIS_URL: 'redis://:p%40ss%3Aword@redis:6379/3',
        },
        ports
      )
    assert.equal(ports.DEV_FRONTEND_PORT, 28010)
    assert.equal(backendEnvironment.PORT, '28020')
    assert.equal(backendEnvironment.DEV_BACKEND_PORT, '28020')
    const databaseConnection = new URL(backendEnvironment.DATABASE_URL)
    assert.equal(databaseConnection.hostname, '127.0.0.1')
    assert.equal(databaseConnection.port, String(ports.DEV_POSTGRES_PORT))
    assert.equal(databaseConnection.password, 'p%40ss%3Aword')
    assert.equal(databaseConnection.pathname, '/salary')
    assert.equal(databaseConnection.searchParams.get('sslmode'), 'disable')
    const redisConnection = new URL(backendEnvironment.REDIS_URL)
    assert.equal(redisConnection.port, String(ports.DEV_REDIS_PORT))
    assert.equal(redisConnection.password, 'p%40ss%3Aword')
    assert.equal(redisConnection.pathname, '/3')
    assert.equal(
      backendEnvironment.SEARCH_ENGINE_URL,
      `http://127.0.0.1:${ports.DEV_SEARCH_PORT}`
    )
    assert.deepEqual(backendEnvironment.ALLOWED_ORIGIN.split(','), [
      'http://localhost:28010',
      'http://127.0.0.1:28010',
      'http://localhost:28020',
      'http://127.0.0.1:28020',
    ])
  } finally {
    if (previousFrontendPort === undefined) delete process.env.DEV_FRONTEND_PORT
    else process.env.DEV_FRONTEND_PORT = previousFrontendPort
    if (previousBackendPort === undefined) delete process.env.DEV_BACKEND_PORT
    else process.env.DEV_BACKEND_PORT = previousBackendPort
  }
})

test('invalid and duplicate port configuration fails before Docker or applications are started', () => {
  const previousFrontendPort = process.env.DEV_FRONTEND_PORT
  const previousBackendPort = process.env.DEV_BACKEND_PORT
  try {
    for (const invalidPort of ['0', '65536', '18010.5', '18010oops']) {
      process.env.DEV_FRONTEND_PORT = invalidPort
      assert.throws(
        loadLocalDevelopmentEnvironmentAndServicePorts,
        /DEV_FRONTEND_PORT must be an integer/
      )
    }
    process.env.DEV_FRONTEND_PORT = '28010'
    process.env.DEV_BACKEND_PORT = '28010'
    assert.throws(
      loadLocalDevelopmentEnvironmentAndServicePorts,
      /duplicates another local development service port/
    )
  } finally {
    if (previousFrontendPort === undefined) delete process.env.DEV_FRONTEND_PORT
    else process.env.DEV_FRONTEND_PORT = previousFrontendPort
    if (previousBackendPort === undefined) delete process.env.DEV_BACKEND_PORT
    else process.env.DEV_BACKEND_PORT = previousBackendPort
  }
})

test('occupied ports produce an actionable error while the existing listener stays running', async () => {
  const existingListener = createServer()
  await new Promise((resolveListening, rejectListening) => {
    existingListener.once('error', rejectListening)
    existingListener.listen(
      { host: '127.0.0.1', port: 0, exclusive: true },
      resolveListening
    )
  })
  const { port } = existingListener.address()
  try {
    await assert.rejects(
      assertLocalDevelopmentPortCanListen('DEV_FRONTEND_PORT', port),
      /DEV_FRONTEND_PORT=.*EADDRINUSE/
    )
    assert.equal(existingListener.listening, true)
  } finally {
    await new Promise((resolveClosed) => existingListener.close(resolveClosed))
  }
  await assertLocalDevelopmentPortCanListen('DEV_FRONTEND_PORT', port)
})
