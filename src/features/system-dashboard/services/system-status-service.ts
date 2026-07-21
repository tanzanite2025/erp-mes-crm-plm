import { apiFetch } from '@/lib/api-client'

type SystemComponentConnectionStatus = 'connected' | 'disconnected' | 'warning'

export interface SystemStatusData {
  identity: {
    hostname: string
    os: string
    arch: string
    runtime: string
    uptime: string
    environment: string
  }
  resources: {
    cpu_cores: number
    memory: {
      alloc_mb: number
      sys_mb: number
      container_used_mb: number
      container_limit_mb: number
      num_gc: number
      goroutines: number
    }
  }
  infrastructure: {
    db: {
      status: string
      open_conns: number
      max_open_connections: number
      in_use: number
      idle: number
      wait_count: number
    }
    redis: {
      status: string
    }
  }
  components: {
    postgres: {
      status: 'connected' | 'disconnected' | 'warning'
      detail?: string
    }
    redis: {
      status: 'connected' | 'disconnected' | 'warning'
      detail?: string
    }
    watchdog: {
      status: 'connected' | 'disconnected' | 'warning'
      detail?: string
    }
    loki: {
      status: 'connected' | 'disconnected' | 'warning'
      detail?: string
    }
  }
  time: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null
}

function readString(source: Record<string, unknown> | null, ...keys: string[]) {
  if (!source) return undefined
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string') {
      return value
    }
  }
  return undefined
}

function readNumber(source: Record<string, unknown> | null, ...keys: string[]) {
  if (!source) return undefined
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return undefined
}

function toComponentStatus(
  status: string | undefined
): SystemComponentConnectionStatus {
  if (status === 'connected') {
    return 'connected'
  }
  if (status === 'warning') {
    return 'warning'
  }
  if (!status) {
    return 'warning'
  }
  return 'disconnected'
}

function normalizeComponent(
  value: unknown,
  fallbackStatus: SystemComponentConnectionStatus
): { status: SystemComponentConnectionStatus; detail?: string } {
  const record = asRecord(value)
  if (!record) {
    return { status: fallbackStatus }
  }

  return {
    status: toComponentStatus(readString(record, 'status')),
    detail: readString(record, 'detail'),
  }
}

export function normalizeSystemStatusData(input: unknown): SystemStatusData {
  const root = asRecord(input)
  const identity = asRecord(root?.identity)
  const resources = asRecord(root?.resources)
  const memory = asRecord(resources?.memory)
  const infrastructure = asRecord(root?.infrastructure)
  const db = asRecord(infrastructure?.db)
  const redis = asRecord(infrastructure?.redis)
  const components = asRecord(root?.components)

  const dbStatus = readString(db, 'status')
  const redisStatus = readString(redis, 'status')

  return {
    identity: {
      hostname: readString(identity, 'hostname') || '',
      os: readString(identity, 'os') || '',
      arch: readString(identity, 'arch') || '',
      runtime: readString(identity, 'runtime') || '',
      uptime: readString(identity, 'uptime') || '',
      environment: readString(identity, 'environment') || 'UNKNOWN',
    },
    resources: {
      cpu_cores: readNumber(resources, 'cpu_cores', 'cpuCores') || 0,
      memory: {
        alloc_mb: readNumber(memory, 'alloc_mb', 'allocMB') || 0,
        sys_mb: readNumber(memory, 'sys_mb', 'sysMB') || 0,
        container_used_mb:
          readNumber(memory, 'container_used_mb', 'containerUsedMB') || 0,
        container_limit_mb:
          readNumber(memory, 'container_limit_mb', 'containerLimitMB') || 0,
        num_gc: readNumber(memory, 'num_gc', 'numGC') || 0,
        goroutines: readNumber(memory, 'goroutines') || 0,
      },
    },
    infrastructure: {
      db: {
        status: dbStatus || 'unknown',
        open_conns: readNumber(db, 'open_conns', 'openConnections') || 0,
        max_open_connections:
          readNumber(db, 'max_open_connections', 'maxOpenConnections') || 0,
        in_use: readNumber(db, 'in_use', 'inUse') || 0,
        idle: readNumber(db, 'idle') || 0,
        wait_count: readNumber(db, 'wait_count', 'waitCount') || 0,
      },
      redis: {
        status: redisStatus || 'unknown',
      },
    },
    components: {
      postgres: normalizeComponent(
        components?.postgres,
        toComponentStatus(dbStatus)
      ),
      redis: normalizeComponent(
        components?.redis,
        toComponentStatus(redisStatus)
      ),
      watchdog: normalizeComponent(components?.watchdog, 'warning'),
      loki: normalizeComponent(components?.loki, 'warning'),
    },
    time: readString(root, 'time') || '',
  }
}

export interface ActiveAlert {
  id: string
  fingerprint: string
  status: string
  severity: string
  name: string
  description: string
  startsAt: string
}

export interface AlertDiagnosticLog {
  id: string
  fingerprint: string
  status: string
  severity: string
  name: string
  description: string
  startsAt: string
  endsAt?: string
  receivedAt: string
  durationSeconds: number
}

export interface AlertDiagnosticsData {
  active: ActiveAlert[]
  logs: AlertDiagnosticLog[]
}

export const SystemStatusService = {
  async getStatus(): Promise<SystemStatusData> {
    const response = await apiFetch<unknown>('/system/status')
    return normalizeSystemStatusData(response)
  },

  async getActiveAlerts(): Promise<ActiveAlert[]> {
    return apiFetch('/system/status/alerts/active')
  },

  async getDiagnosticAlerts(): Promise<AlertDiagnosticsData> {
    return apiFetch('/system/status/alerts/diagnostic')
  },
}
