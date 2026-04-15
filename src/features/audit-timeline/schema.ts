import type { AuditLog, DiffItem } from './types'

const toString = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const parseDiffItem = (value: unknown): DiffItem => {
  const record = isRecord(value) ? value : {}

  return {
    f: toString(record.f),
    o: record.o,
    n: record.n,
    a: toString(record.a),
  }
}

const parseDiffList = (value: unknown): DiffItem[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(parseDiffItem)
}

const parseAuditLog = (value: unknown): AuditLog => {
  const record = isRecord(value) ? value : {}

  return {
    id: toString(record.id),
    module: toString(record.module),
    target_id: toString(record.target_id),
    action: toString(record.action),
    diff: parseDiffList(record.diff),
    operator: toString(record.operator),
    ip: toString(record.ip),
    created_at: toString(record.created_at),
  }
}

export const parseAuditTimelineResponse = (value: unknown): AuditLog[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(parseAuditLog)
}
