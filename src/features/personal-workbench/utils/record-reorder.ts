import { personalWorkbenchColumns, type PersonalWorkbenchColumnKey } from '../data/constants'
import type { PersonalRecord } from '../data/schema'

export interface PersonalRecordReorderItem {
  id: string
  columnKey: PersonalWorkbenchColumnKey
  sortOrder: number
}

export interface PersonalRecordDragPosition {
  columnKey: PersonalWorkbenchColumnKey
  index: number
}

function normalizeColumnRecords(records: PersonalRecord[], columnKey: PersonalWorkbenchColumnKey): PersonalRecord[] {
  return records
    .filter((record) => record.columnKey === columnKey)
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
      return left.updatedAt.localeCompare(right.updatedAt)
    })
}

export function reorderPersonalRecords(
  records: PersonalRecord[],
  sourceRecordId: string,
  destination: PersonalRecordDragPosition
): { records: PersonalRecord[]; updates: PersonalRecordReorderItem[] } {
  const sourceRecord = records.find((record) => record.id === sourceRecordId)
  if (!sourceRecord) {
    return { records, updates: [] }
  }

  const columnMap = new Map<PersonalWorkbenchColumnKey, PersonalRecord[]>()
  for (const column of personalWorkbenchColumns) {
    columnMap.set(column.key, normalizeColumnRecords(records, column.key))
  }

  const sourceColumnRecords = [...(columnMap.get(sourceRecord.columnKey) ?? [])]
  const destinationColumnRecords =
    sourceRecord.columnKey === destination.columnKey
      ? sourceColumnRecords
      : [...(columnMap.get(destination.columnKey) ?? [])]

  const sourceIndex = sourceColumnRecords.findIndex((record) => record.id === sourceRecordId)
  if (sourceIndex < 0) {
    return { records, updates: [] }
  }

  const [draggedRecord] = sourceColumnRecords.splice(sourceIndex, 1)
  const boundedDestinationIndex = Math.max(0, Math.min(destination.index, destinationColumnRecords.length))
  const nextRecord = { ...draggedRecord, columnKey: destination.columnKey }

  if (sourceRecord.columnKey === destination.columnKey) {
    sourceColumnRecords.splice(boundedDestinationIndex, 0, nextRecord)
    columnMap.set(destination.columnKey, sourceColumnRecords)
  } else {
    destinationColumnRecords.splice(boundedDestinationIndex, 0, nextRecord)
    columnMap.set(sourceRecord.columnKey, sourceColumnRecords)
    columnMap.set(destination.columnKey, destinationColumnRecords)
  }

  const updates: PersonalRecordReorderItem[] = []
  const nextRecords: PersonalRecord[] = []

  for (const column of personalWorkbenchColumns) {
    const columnRecords = (columnMap.get(column.key) ?? []).map((record, index) => {
      const next = {
        ...record,
        columnKey: column.key,
        sortOrder: index,
      }
      const original = records.find((item) => item.id === record.id)
      if (!original || original.columnKey !== next.columnKey || original.sortOrder !== next.sortOrder) {
        updates.push({ id: next.id, columnKey: next.columnKey, sortOrder: next.sortOrder })
      }
      return next
    })
    nextRecords.push(...columnRecords)
  }

  return { records: nextRecords, updates }
}
