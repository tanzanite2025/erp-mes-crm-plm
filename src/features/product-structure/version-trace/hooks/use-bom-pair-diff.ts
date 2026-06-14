import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type BOMVersionRecordDetail } from '../contracts/bom-version-trace'
import { bomVersionTraceQueryKeys } from '../query-keys'
import { bomVersionTraceService } from '../services/bom-version-trace-service'
import {
  buildBOMVersionDiffSummary,
  type BOMVersionDiffSummary,
} from '../utils/bom-version-diff'

export interface BomPairDiffParams {
  /** 左侧版本快照 ID（bom_version_snapshots.id） */
  leftVersionId: string
  /** 右侧版本快照 ID（bom_version_snapshots.id） */
  rightVersionId: string
  /** 是否启用查询。通常与弹窗 open 状态绑定。 */
  enabled: boolean
}

export interface BomPairDiffResult {
  leftDetail: BOMVersionRecordDetail | null
  rightDetail: BOMVersionRecordDetail | null
  diffSummary: BOMVersionDiffSummary | null
  isLoading: boolean
  error: unknown
}

/**
 * 给定两个 BOM 版本快照 ID，拉取两个 detail 并计算 diff。
 *
 * 与 useBOMVersionTrace 的区别：
 * - 不拉版本历史列表（不需要分组/选择器）
 * - 左右两个版本的 ID 由调用方完全控制（典型场景：MBOM 关联到草稿 EBOM 的对比）
 */
export function useBomPairDiff({
  leftVersionId,
  rightVersionId,
  enabled,
}: BomPairDiffParams): BomPairDiffResult {
  const normalizedLeftId = leftVersionId.trim()
  const normalizedRightId = rightVersionId.trim()

  const leftQuery = useQuery({
    queryKey: bomVersionTraceQueryKeys.detail(normalizedLeftId),
    queryFn: () => bomVersionTraceService.getVersionRecord(normalizedLeftId),
    enabled: enabled && normalizedLeftId.length > 0,
  })

  const rightQuery = useQuery({
    queryKey: bomVersionTraceQueryKeys.detail(normalizedRightId),
    queryFn: () => bomVersionTraceService.getVersionRecord(normalizedRightId),
    enabled:
      enabled &&
      normalizedRightId.length > 0 &&
      normalizedRightId !== normalizedLeftId,
  })

  const leftDetail = leftQuery.data ?? null
  const rightDetail = rightQuery.data ?? null

  const diffSummary = useMemo(() => {
    if (!leftDetail || !rightDetail || leftDetail.id === rightDetail.id) {
      return null
    }
    return buildBOMVersionDiffSummary(leftDetail, rightDetail)
  }, [leftDetail, rightDetail])

  return {
    leftDetail,
    rightDetail,
    diffSummary,
    isLoading: leftQuery.isPending || rightQuery.isPending,
    error: leftQuery.error ?? rightQuery.error ?? null,
  }
}
