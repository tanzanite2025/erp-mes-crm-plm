import type { AuditEngineModuleStats, AuditEngineStatsResponse } from './types'

const DEFAULT_HOT_WINDOW_DAYS = 30

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? '')).filter(Boolean)
}

const toPositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback
  }
  return Math.max(1, Math.floor(value))
}

const toString = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const hasOwn = (record: Record<string, unknown>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(record, key)
}

const readCoreCount = (
  record: Record<string, unknown>,
  moduleId: string,
  field: string,
  legacyField?: string
): number => {
  const selectedField = hasOwn(record, field)
    ? field
    : legacyField && hasOwn(record, legacyField)
      ? legacyField
      : field
  const value = record[selectedField]

  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Invalid audit engine module ${moduleId || '<unknown>'}: ${selectedField} must be a finite non-negative number`
    )
  }

  return value
}

const calculateCoverage = (count: number, target: number): number => {
  return target > 0 ? (count / target) * 100 : 0
}

const deriveIntegrationStatus = (
  integratedCount: number,
  targetCount: number
): Pick<AuditEngineModuleStats, 'connected' | 'status'> => {
  const connected = targetCount > 0 && integratedCount === targetCount
  return {
    connected,
    status: connected ? 'HEALTHY' : integratedCount > 0 ? 'ALERT' : 'CRITICAL',
  }
}

const preferStringArray = (primary: unknown, legacy: unknown): string[] => {
  return Array.isArray(primary) ? toStringArray(primary) : toStringArray(legacy)
}

const parseModuleStats = (value: unknown): AuditEngineModuleStats => {
  const record = isRecord(value) ? value : {}
  const id = toString(record.id)
  const targetEntityCount = readCoreCount(record, id, 'targetEntityCount')
  const integratedEntityCount = readCoreCount(
    record,
    id,
    'integratedEntityCount',
    'entryEntityCount'
  )
  const activeEntityCount = readCoreCount(
    record,
    id,
    'activeEntityCount',
    'loggedEntityCount'
  )

  if (
    integratedEntityCount > targetEntityCount ||
    activeEntityCount > targetEntityCount
  ) {
    throw new Error(
      `Invalid audit engine module ${id || '<unknown>'}: entity counts cannot exceed targetEntityCount`
    )
  }

  const integrationState = deriveIntegrationStatus(
    integratedEntityCount,
    targetEntityCount
  )

  return {
    id,
    targetEntityCount,
    integratedEntityCount,
    activeEntityCount,
    integrationCoverage: calculateCoverage(
      integratedEntityCount,
      targetEntityCount
    ),
    activityCoverage: calculateCoverage(activeEntityCount, targetEntityCount),
    ...integrationState,
    lastEvent: toString(record.lastEvent) || undefined,
    integratedEntities: preferStringArray(
      record.integratedEntities,
      record.entryEntities
    ),
    activeEntities: preferStringArray(
      record.activeEntities,
      record.loggedEntities
    ),
    missingIntegrationEntities: toStringArray(
      record.missingIntegrationEntities
    ),
  }
}

export const parseAuditEngineStatsResponse = (
  value: unknown
): AuditEngineStatsResponse => {
  const record = isRecord(value) ? value : {}
  const modules = Array.isArray(record.modules)
    ? record.modules.map(parseModuleStats).filter((module) => module.id)
    : []
  const unmappedLogEntities = toStringArray(record.unmappedLogEntities)
  const unmappedLogEntityCount = record.unmappedLogEntityCount

  return {
    modules,
    hotWindowDays: toPositiveInteger(
      record.hotWindowDays,
      DEFAULT_HOT_WINDOW_DAYS
    ),
    unmappedLogEntities,
    unmappedLogEntityCount:
      typeof unmappedLogEntityCount === 'number' &&
      Number.isFinite(unmappedLogEntityCount) &&
      unmappedLogEntityCount >= 0
        ? unmappedLogEntityCount
        : unmappedLogEntities.length,
  }
}
