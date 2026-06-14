import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  RuleExecutionLog,
  RuleExecutionStatus,
} from '@/features/system-mgmt/workflow-core/data/rule-execution-log-schema'
import { RoutingService } from '@/features/system-mgmt/workflow-core/services/routing-service'
import {
  getMetadataRecord,
  getMetadataString,
} from '@/features/system-mgmt/workflow-core/services/target-resolver'

const QUALITY_STANDARD_ROUTING_LOG_PAGE_SIZE = 200

export interface QualityStandardRoutingLogSummary {
  standardId: string
  executionStatus: RuleExecutionStatus
  executionType: RuleExecutionLog['executionType']
  title: string
  content: string
  triggeredAt?: string
  approvalRequestId?: string
}

function resolveQualityStandardId(log: RuleExecutionLog) {
  const metadata = getMetadataRecord(log.metadata)

  return (
    getMetadataString(metadata, 'targetId') ||
    getMetadataString(metadata, 'TargetId') ||
    getMetadataString(metadata, 'standardId') ||
    getMetadataString(metadata, 'StandardId') ||
    undefined
  )
}

function buildRoutingLogSummary(
  log: RuleExecutionLog
): QualityStandardRoutingLogSummary | null {
  const standardId = resolveQualityStandardId(log)
  if (!standardId) return null

  const metadata = getMetadataRecord(log.metadata)

  return {
    standardId,
    executionStatus: log.executionStatus,
    executionType: log.executionType,
    title: log.title,
    content: log.content,
    triggeredAt: log.triggeredAt,
    approvalRequestId: getMetadataString(metadata, 'approvalRequestId'),
  }
}

function getLogSortTime(log: RuleExecutionLog) {
  return new Date(log.triggeredAt || log.createdAt).getTime()
}

export function useQualityStandardRoutingLogSummaries(standardIds: string[]) {
  const normalizedStandardIds = useMemo(
    () => Array.from(new Set(standardIds.filter(Boolean))).sort(),
    [standardIds]
  )

  const query = useQuery({
    queryKey: ['quality-standard-routing-log-summaries', normalizedStandardIds],
    queryFn: async () => {
      const response = await RoutingService.getExecutionLogs({
        page: 1,
        pageSize: QUALITY_STANDARD_ROUTING_LOG_PAGE_SIZE,
        entity: 'QUALITY',
        sourceCode: 'QUALITY_STANDARD',
        executionType: 'approval',
      })

      return response.items
    },
    enabled: normalizedStandardIds.length > 0,
  })

  const summaryMap = useMemo(() => {
    const idSet = new Set(normalizedStandardIds)
    const map: Record<string, QualityStandardRoutingLogSummary> = {}

    for (const log of query.data ?? []) {
      const summary = buildRoutingLogSummary(log)
      if (!summary || !idSet.has(summary.standardId)) {
        continue
      }

      const previous = map[summary.standardId]
      if (!previous) {
        map[summary.standardId] = summary
        continue
      }

      const previousTime = new Date(previous.triggeredAt || 0).getTime()
      if (getLogSortTime(log) > previousTime) {
        map[summary.standardId] = summary
      }
    }

    return map
  }, [normalizedStandardIds, query.data])

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    summaryMap,
  }
}
