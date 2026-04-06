import { apiFetch } from '@/lib/api-client'

export interface SystemStatusData {
  identity: {
    hostname: string
    os: string
    arch: string
    runtime: string
    uptime: string
  }
  resources: {
    cpu_cores: number
    memory: {
      alloc_mb: number
      sys_mb: number
      num_gc: number
      goroutines: number
    }
  }
  infrastructure: {
    db: {
      open_conns: number
      in_use: number
      idle: number
      wait_count: number
    }
    redis: {
      status: string
    }
  }
  time: string
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
    return apiFetch('/system/status')
  },

  async getActiveAlerts(): Promise<ActiveAlert[]> {
    return apiFetch('/system/status/alerts/active')
  },

  async getDiagnosticAlerts(): Promise<AlertDiagnosticsData> {
    return apiFetch('/system/status/alerts/diagnostic')
  },
}
