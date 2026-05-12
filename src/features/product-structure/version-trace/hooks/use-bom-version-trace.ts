'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type BOMVersionRecordDetail,
  type BOMVersionRecordSummary,
} from '../contracts/bom-version-trace'
import { bomVersionTraceQueryKeys } from '../query-keys'
import { bomVersionTraceService } from '../services/bom-version-trace-service'
import { buildBOMVersionDiffSummary } from '../utils/bom-version-diff'

export interface BOMVersionTraceGroup {
  bomId: string
  bomNo: string
  records: BOMVersionRecordSummary[]
}

function normalizeID(value?: string) {
  return value?.trim() || ''
}

function toTimeValue(value?: string) {
  if (!value) {
    return 0
  }
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function normalizeDateFilter(value?: string) {
  return value?.trim() || ''
}

function toDayBoundaryTime(value: string, boundary: 'start' | 'end') {
  const normalized = normalizeDateFilter(value)
  if (!normalized) {
    return undefined
  }
  const suffix = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999'
  const timestamp = new Date(`${normalized}${suffix}`).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

function filterHistoryByCreatedAt(records: BOMVersionRecordSummary[], createdFrom?: string, createdTo?: string) {
  const fromTime = createdFrom ? toDayBoundaryTime(createdFrom, 'start') : undefined
  const toTime = createdTo ? toDayBoundaryTime(createdTo, 'end') : undefined
  if (fromTime === undefined && toTime === undefined) {
    return records
  }
  return records.filter((record) => {
    const recordTime = toTimeValue(record.createdAt)
    if (recordTime === 0) {
      return false
    }
    if (fromTime !== undefined && recordTime < fromTime) {
      return false
    }
    if (toTime !== undefined && recordTime > toTime) {
      return false
    }
    return true
  })
}

function groupHistory(records: BOMVersionRecordSummary[]): BOMVersionTraceGroup[] {
  const grouped = new Map<string, BOMVersionTraceGroup>()
  records.forEach((record) => {
    const bomId = normalizeID(record.bomId) || '__unknown__'
    const existing = grouped.get(bomId)
    if (existing) {
      existing.records.push(record)
      return
    }
    grouped.set(bomId, {
      bomId,
      bomNo: record.bomNo,
      records: [record],
    })
  })

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      records: [...group.records].sort((left, right) => toTimeValue(right.createdAt) - toTimeValue(left.createdAt)),
    }))
    .sort((left, right) => toTimeValue(right.records[0]?.createdAt) - toTimeValue(left.records[0]?.createdAt))
}

function resolveNextRightVersion(records: BOMVersionRecordSummary[], leftVersionId: string, currentRightVersionId: string) {
  if (currentRightVersionId && currentRightVersionId !== leftVersionId && records.some((record) => record.id === currentRightVersionId)) {
    return currentRightVersionId
  }
  return records.find((record) => record.id !== leftVersionId)?.id || ''
}

export function useBOMVersionTrace(params: { bomId?: string; productId?: string; createdFrom?: string; createdTo?: string; open: boolean }) {
  const bomId = normalizeID(params.bomId)
  const productId = normalizeID(params.productId)
  const createdFrom = normalizeDateFilter(params.createdFrom)
  const createdTo = normalizeDateFilter(params.createdTo)
  const [selectedBomIdState, setSelectedBomId] = useState(bomId)
  const [leftVersionIdState, setLeftVersionId] = useState('')
  const [rightVersionIdState, setRightVersionId] = useState('')

  const historyQuery = useQuery({
    queryKey: bomVersionTraceQueryKeys.list({ bomId, productId }),
    queryFn: () => bomVersionTraceService.getVersionHistory({ bomId, productId }),
    enabled: params.open,
  })

  const filteredHistory = useMemo(
    () => filterHistoryByCreatedAt(historyQuery.data ?? [], createdFrom, createdTo),
    [createdFrom, createdTo, historyQuery.data]
  )

  const groups = useMemo(() => groupHistory(filteredHistory), [filteredHistory])

  const activeBomId = useMemo(() => {
    if (bomId) {
      return bomId
    }
    if (selectedBomIdState && groups.some((group) => group.bomId === selectedBomIdState)) {
      return selectedBomIdState
    }
    return groups[0]?.bomId || ''
  }, [bomId, groups, selectedBomIdState])

  const activeRecords = useMemo(() => {
    if (!activeBomId) {
      return filteredHistory
    }
    return filteredHistory.filter((record) => record.bomId === activeBomId)
  }, [activeBomId, filteredHistory])

  const leftVersionId = useMemo(() => {
    if (leftVersionIdState && activeRecords.some((record) => record.id === leftVersionIdState)) {
      return leftVersionIdState
    }
    return activeRecords[0]?.id || ''
  }, [activeRecords, leftVersionIdState])

  const rightVersionId = useMemo(
    () => resolveNextRightVersion(activeRecords, leftVersionId, rightVersionIdState),
    [activeRecords, leftVersionId, rightVersionIdState]
  )

  const leftDetailQuery = useQuery({
    queryKey: bomVersionTraceQueryKeys.detail(leftVersionId),
    queryFn: () => bomVersionTraceService.getVersionRecord(leftVersionId),
    enabled: params.open && leftVersionId.length > 0,
  })

  const rightDetailQuery = useQuery({
    queryKey: bomVersionTraceQueryKeys.detail(rightVersionId),
    queryFn: () => bomVersionTraceService.getVersionRecord(rightVersionId),
    enabled: params.open && rightVersionId.length > 0 && rightVersionId !== leftVersionId,
  })

  const leftDetail = leftDetailQuery.data
  const rightDetail: BOMVersionRecordDetail | undefined = rightVersionId === leftVersionId
    ? leftDetailQuery.data
    : rightDetailQuery.data

  const diffSummary = useMemo(
    () => (leftDetail && rightDetail && leftDetail.id !== rightDetail.id ? buildBOMVersionDiffSummary(leftDetail, rightDetail) : null),
    [leftDetail, rightDetail]
  )

  return {
    groups,
    activeBomId,
    setSelectedBomId,
    activeRecords,
    leftVersionId,
    setLeftVersionId,
    rightVersionId,
    setRightVersionId,
    leftDetail,
    rightDetail,
    diffSummary,
    isLoadingHistory: historyQuery.isLoading,
    isLoadingDetails: leftDetailQuery.isLoading || rightDetailQuery.isLoading,
    error: historyQuery.error || leftDetailQuery.error || rightDetailQuery.error,
    hasAnyRecord: filteredHistory.length > 0,
  }
}
