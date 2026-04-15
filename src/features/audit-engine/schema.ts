import type { AuditEngineModuleStats, AuditEngineStatsResponse } from './types'

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => String(item ?? ''))
}

const toNumber = (value: unknown): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const toBoolean = (value: unknown): boolean => {
  return typeof value === 'boolean' ? value : false
}

const toString = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const toStatus = (value: unknown): AuditEngineModuleStats['status'] => {
  if (value === 'HEALTHY' || value === 'ALERT' || value === 'CRITICAL') {
    return value
  }

  return 'CRITICAL'
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const parseModuleStats = (value: unknown): AuditEngineModuleStats => {
  const record = isRecord(value) ? value : {}

  return {
    id: toString(record.id),
    targetEntityCount: toNumber(record.targetEntityCount),
    loggedEntityCount: toNumber(record.loggedEntityCount),
    entryEntityCount: toNumber(record.entryEntityCount),
    coverage: toNumber(record.coverage),
    logCoverage: toNumber(record.logCoverage),
    entryCoverage: toNumber(record.entryCoverage),
    connected: toBoolean(record.connected),
    status: toStatus(record.status),
    lastEvent: toString(record.lastEvent) || undefined,
    connectedEntities: toStringArray(record.connectedEntities),
    loggedEntities: toStringArray(record.loggedEntities),
    entryEntities: toStringArray(record.entryEntities),
  }
}

export const parseAuditEngineStatsResponse = (value: unknown): AuditEngineStatsResponse => {
  const record = isRecord(value) ? value : {}
  const modules = Array.isArray(record.modules) ? record.modules.map(parseModuleStats) : []

  return { modules }
}
