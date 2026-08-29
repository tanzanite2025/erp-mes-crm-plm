import { apiFetch } from '@/lib/api-client'

export type AttendanceDeviceProtocol =
  | 'isapi'
  | 'isup-ehome'
  | 'hcnet-sdk'
  | 'openapi'
  | 'webhook'
  | 'csv-import'
  | 'database-view'
  | 'middleware-push'
  | 'manual'
  | 'custom-http'
  | 'custom-file-watch'

export type AttendanceDeviceCollectMode = 'pull' | 'push' | 'manual' | 'file'

export type AttendanceDeviceStatus =
  | 'active'
  | 'paused'
  | 'offline'
  | 'maintenance'

export interface AttendanceDevice {
  id: string
  createdAt: string
  updatedAt: string
  deviceCode: string
  name: string
  vendor: string
  model: string
  protocol: AttendanceDeviceProtocol
  endpoint: string
  port: number
  username: string
  location: string
  orgUnitId: string
  status: AttendanceDeviceStatus
  collectMode: AttendanceDeviceCollectMode
  pollIntervalSeconds: number
  timeZone: string
  employeeMatchField: string
  deviceEmployeeKeyField: string
  eventTimeField: string
  rawEventCodeField: string
  clockDirectionRule: string
  deduplicateWindowSec: number
  config: Record<string, unknown>
  lastSyncAt?: string | null
  lastSyncStatus: string
  lastSyncMessage: string
  version: number
  hasSecret: boolean
  hasIngressToken: boolean
  lastEventAt?: string | null
  lastSyncFetched: number
  lastSyncAccepted: number
  lastHealthCheckAt?: string | null
  lastHealthStatus: string
  lastHealthMessage: string
  lastHealthLatencyMs: number
}

export interface AttendanceDeviceInput {
  id?: string
  deviceCode: string
  name: string
  vendor: string
  model: string
  protocol: AttendanceDeviceProtocol
  endpoint: string
  port: number
  username: string
  secret?: string
  location: string
  orgUnitId: string
  status: AttendanceDeviceStatus
  collectMode: AttendanceDeviceCollectMode
  pollIntervalSeconds: number
  timeZone: string
  employeeMatchField: string
  deviceEmployeeKeyField: string
  eventTimeField: string
  rawEventCodeField: string
  clockDirectionRule: string
  deduplicateWindowSec: number
  config: Record<string, unknown>
}

export interface AttendanceEvent {
  id: string
  deviceId: string
  employeeId: string
  deviceEmployeeKey: string
  externalEventId: string
  occurredAt: string
  direction: 'in' | 'out' | 'unknown'
  eventType: string
  verificationMethod: string
  source: string
  fingerprint: string
  matchStatus: 'matched' | 'unmatched'
  matchMessage: string
  rawPayload: Record<string, unknown>
  deviceCode: string
  deviceName: string
  employeeName: string
  staffId: string
}

export interface AttendanceEventListResult {
  items: AttendanceEvent[]
  total: number
}

export interface AttendanceDeviceMapping {
  id: string
  deviceId: string
  employeeId: string
  deviceEmployeeKey: string
  matchField: string
  source: string
  status: string
  lastSeenAt?: string | null
  notes: string
  deviceCode: string
  deviceName: string
  employeeName: string
  staffId: string
}

export interface AttendanceDeviceMappingInput {
  id?: string
  deviceId: string
  deviceEmployeeKey: string
  employeeId: string
  matchField?: string
  source?: string
  status?: string
  notes?: string
}

export interface AttendanceDeviceTemplate {
  vendor: string
  label: string
  defaultModel: string
  protocol: AttendanceDeviceProtocol
  collectMode: AttendanceDeviceCollectMode
  port: number
  employeeMatchField: string
  deviceEmployeeKeyField: string
  eventTimeField: string
  rawEventCodeField: string
  clockDirectionRule: string
  config: Record<string, unknown>
  notes: string[]
}

export interface AttendanceDeviceTestResult {
  deviceId: string
  deviceCode: string
  status: string
  reachable: boolean
  latencyMs: number
  protocol: string
  endpoint: string
  checkedAt: string
  message: string
  nextAdapterAction: string
}

export interface AttendanceSyncResult {
  deviceId: string
  deviceCode: string
  status: string
  fetched: number
  accepted: number
  duplicates: number
  unmatched: number
  startedAt: string
  finishedAt: string
  message: string
  adapter: string
}

function normalizeDeviceConfig(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeDevice(device: AttendanceDevice): AttendanceDevice {
  return {
    ...device,
    config: normalizeDeviceConfig(device.config),
  }
}

function normalizeTemplate(
  template: AttendanceDeviceTemplate
): AttendanceDeviceTemplate {
  return {
    ...template,
    config: normalizeDeviceConfig(template.config),
    notes: Array.isArray(template.notes) ? template.notes : [],
  }
}

export const attendanceDeviceService = {
  async getDevices(): Promise<AttendanceDevice[]> {
    const devices = await apiFetch<AttendanceDevice[]>('/attendance-devices')
    return Array.isArray(devices) ? devices.map(normalizeDevice) : []
  },

  async getTemplates(): Promise<AttendanceDeviceTemplate[]> {
    const templates = await apiFetch<AttendanceDeviceTemplate[]>(
      '/attendance-devices/templates'
    )
    return Array.isArray(templates) ? templates.map(normalizeTemplate) : []
  },

  async saveDevice(input: AttendanceDeviceInput): Promise<AttendanceDevice> {
    const saved = await apiFetch<AttendanceDevice>('/attendance-devices', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return normalizeDevice(saved)
  },

  async deleteDevice(id: string): Promise<void> {
    await apiFetch(`/attendance-devices/${id}`, {
      method: 'DELETE',
    })
  },

  async testDevice(id: string): Promise<AttendanceDeviceTestResult> {
    return apiFetch<AttendanceDeviceTestResult>(
      `/attendance-devices/${id}/test`,
      {
        method: 'POST',
      }
    )
  },

  async syncDevice(id: string): Promise<AttendanceSyncResult> {
    return apiFetch<AttendanceSyncResult>(`/attendance-devices/${id}/sync`, {
      method: 'POST',
    })
  },

  async setIngressToken(id: string, token: string): Promise<void> {
    await apiFetch(`/attendance-devices/${id}/ingress-token`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },

  async getEvents(
    deviceId?: string,
    matchStatus?: string
  ): Promise<AttendanceEventListResult> {
    const params = new URLSearchParams()
    if (deviceId) params.set('deviceId', deviceId)
    if (matchStatus) params.set('matchStatus', matchStatus)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiFetch<AttendanceEventListResult>(
      `/attendance-devices/events${query}`
    )
  },

  async getMappings(deviceId?: string): Promise<AttendanceDeviceMapping[]> {
    const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''
    const mappings = await apiFetch<AttendanceDeviceMapping[]>(
      `/attendance-devices/mappings${query}`
    )
    return Array.isArray(mappings) ? mappings : []
  },

  async saveMapping(
    input: AttendanceDeviceMappingInput
  ): Promise<AttendanceDeviceMapping> {
    const saved = await apiFetch<AttendanceDeviceMapping>(
      `/attendance-devices/${input.deviceId}/mappings`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    )
    return saved
  },

  async deleteMapping(id: string): Promise<void> {
    await apiFetch(`/attendance-devices/mappings/${id}`, {
      method: 'DELETE',
    })
  },
}
