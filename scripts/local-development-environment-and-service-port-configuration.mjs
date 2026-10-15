import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const defaultLocalDevelopmentServicePorts = {
  DEV_FRONTEND_PORT: 18010,
  DEV_BACKEND_PORT: 18020,
  DEV_SEARCH_PORT: 18030,
  DEV_POSTGRES_PORT: 18040,
  DEV_REDIS_PORT: 18050,
}

export function loadLocalDevelopmentEnvironmentAndServicePorts() {
  const environmentFile = resolve(repositoryRoot, 'server/.env.dev')
  if (!existsSync(environmentFile)) {
    copyFileSync(
      resolve(repositoryRoot, 'server/.env.dev.example'),
      environmentFile
    )
  }
  const environment = {
    ...parseEnv(readFileSync(environmentFile, 'utf8')),
    ...process.env,
  }
  const ports = {}
  const assignedPorts = new Set()
  for (const [variable, defaultPort] of Object.entries(
    defaultLocalDevelopmentServicePorts
  )) {
    const configuredPort = String(environment[variable] ?? defaultPort).trim()
    const port = Number(configuredPort)
    if (
      !/^\d+$/.test(configuredPort) ||
      !Number.isInteger(port) ||
      port < 1024 ||
      port > 65535
    ) {
      throw new Error(`${variable} must be an integer between 1024 and 65535`)
    }
    if (assignedPorts.has(port)) {
      throw new Error(
        `${variable} duplicates another local development service port: ${port}`
      )
    }
    assignedPorts.add(port)
    ports[variable] = port
    environment[variable] = String(port)
  }
  return { environment, ports }
}

function replaceLocalConnectionUrlHostAndPort(
  connectionUrl,
  port,
  variableName
) {
  try {
    const connection = new URL(connectionUrl)
    connection.hostname = '127.0.0.1'
    connection.port = String(port)
    return connection.toString()
  } catch {
    throw new Error(
      `${variableName} must contain a valid connection URL in server/.env.dev`
    )
  }
}

export function createLocalBackendEnvironmentWithConfiguredServicePorts(
  environment,
  ports
) {
  return {
    ...environment,
    PORT: String(ports.DEV_BACKEND_PORT),
    DATABASE_URL: replaceLocalConnectionUrlHostAndPort(
      environment.DATABASE_URL,
      ports.DEV_POSTGRES_PORT,
      'DATABASE_URL'
    ),
    REDIS_URL: replaceLocalConnectionUrlHostAndPort(
      environment.REDIS_URL,
      ports.DEV_REDIS_PORT,
      'REDIS_URL'
    ),
    SEARCH_ENGINE_URL: `http://127.0.0.1:${ports.DEV_SEARCH_PORT}`,
    ALLOWED_ORIGIN: [ports.DEV_FRONTEND_PORT, ports.DEV_BACKEND_PORT]
      .flatMap((port) => [
        `http://localhost:${port}`,
        `http://127.0.0.1:${port}`,
      ])
      .join(','),
  }
}

export async function assertLocalDevelopmentPortCanListen(variableName, port) {
  await new Promise((resolvePortAvailable, rejectPortUnavailable) => {
    const probe = createServer()
    probe.once('error', (error) => {
      rejectPortUnavailable(
        new Error(
          `${variableName}=${port} cannot listen on 127.0.0.1 (${error.code}). ` +
            `Choose another ${variableName} in server/.env.dev; on Windows check netsh interface ipv4 show excludedportrange protocol=tcp.`
        )
      )
    })
    probe.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      probe.close((error) =>
        error ? rejectPortUnavailable(error) : resolvePortAvailable()
      )
    })
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (!process.argv.includes('--print-ports')) {
      throw new Error(
        'Use --print-ports to inspect local development service ports'
      )
    }
    console.log(
      JSON.stringify(loadLocalDevelopmentEnvironmentAndServicePorts().ports)
    )
  } catch (error) {
    console.error(`[dev] ${error.message}`)
    process.exitCode = 1
  }
}
