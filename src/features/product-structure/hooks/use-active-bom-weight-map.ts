'use client'

import { useEffect, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { type BOM } from '../data/schema'
import { bomService } from '../services/bom-service'
import { bomQueryKeys } from '../query-keys'

export interface ActiveBOMWeightInfo {
  /** 有 RELEASED BOM 时的重量值 */
  weight: number
  /** 单位代码（来源 basic-settings WEIGHT 类目） */
  unit: string
  /** 是否有可用的 RELEASED 重量（false 时 weight=0、unit=''） */
  available: boolean
}

const EMPTY_WEIGHT: ActiveBOMWeightInfo = { weight: 0, unit: '', available: false }

function pickReleased(boms: BOM[]): BOM | undefined {
  const mbom = boms
    .filter((bom) => bom.bomType === 'MBOM' && bom.status === 'RELEASED')
    .sort(byCreatedAtDesc)[0]
  if (mbom) return mbom

  return boms
    .filter((bom) => bom.bomType === 'EBOM' && bom.status === 'RELEASED')
    .sort(byCreatedAtDesc)[0]
}

function byCreatedAtDesc(a: BOM, b: BOM): number {
  const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
  const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
  return bTime - aTime
}

/**
 * 批量按产品 ID 查询当前 RELEASED BOM 的重量。
 *
 * 方案 B：销售订单打包预览 / packaging-profile 等场景需要在一次渲染里
 * 拿到一组产品的"当前权威重量"，避免给每行都挂一个 useActiveBOM。
 *
 * 实现：复用 React Query 的 useQueries，每个 productId 一个独立 query，
 *   - 同 productId 跨页面共享缓存
 *   - 单个 BOM 失败不影响其他产品的展示
 *   - productIds 为空时返回空 map，零 fetch
 */
export function useActiveBOMWeightMap(
  productIds: ReadonlyArray<string | null | undefined>
): Map<string, ActiveBOMWeightInfo> {
  // 去重 + 去空，按字典序稳定，避免数组身份波动触发 useQueries 重建。
  const normalizedIds = useMemo(() => {
    const set = new Set<string>()
    for (const raw of productIds) {
      const trimmed = (raw ?? '').trim()
      if (trimmed) set.add(trimmed)
    }
    return Array.from(set).sort()
  }, [productIds])

  const queries = useQueries({
    queries: normalizedIds.map((productId) => ({
      queryKey: [...bomQueryKeys.list(), { productId }] as const,
      queryFn: () => bomService.getBOMs({ productId }),
    })),
  })

  // 把失败 query 当作 weight 不可用，但不抛出（packaging 链路应优雅降级 + warning）。
  // 这里仅做轻量 console 日志便于排查。
  useEffect(() => {
    queries.forEach((q, idx) => {
      if (q.isError && q.error) {
        // eslint-disable-next-line no-console
        console.warn(
          '[useActiveBOMWeightMap] BOM query failed for productId',
          normalizedIds[idx],
          q.error
        )
      }
    })
  }, [queries, normalizedIds])

  return useMemo(() => {
    const map = new Map<string, ActiveBOMWeightInfo>()
    queries.forEach((q, idx) => {
      const productId = normalizedIds[idx]
      if (!productId) return
      if (q.isPending || q.isError || !q.data) {
        map.set(productId, EMPTY_WEIGHT)
        return
      }
      const released = pickReleased(q.data)
      if (!released || !released.measuredWeight || released.measuredWeight <= 0) {
        map.set(productId, EMPTY_WEIGHT)
        return
      }
      map.set(productId, {
        weight: released.measuredWeight,
        unit: (released.measuredWeightUnit || '').trim(),
        available: true,
      })
    })
    return map
  }, [queries, normalizedIds])
}
