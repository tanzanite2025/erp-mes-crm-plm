'use client'

import { useEffect, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { type BOM } from '../data/schema'
import { bomService } from '../services/bom-service'
import { bomQueryKeys } from '../query-keys'
import { pickReleasedBOM } from '../utils/pick-released-bom'

export interface ActiveBOMWeightInfo {
  /** 有 RELEASED BOM 时的重量值 */
  weight: number
  /** 单位代码(来源 basic-settings WEIGHT 类目) */
  unit: string
  /** 是否有可用的 RELEASED 重量(false 时 weight=0、unit='') */
  available: boolean
}

const EMPTY_WEIGHT: ActiveBOMWeightInfo = { weight: 0, unit: '', available: false }

/**
 * 产品 ID + 客户 ID 元组,用于在多归属 BOM 场景下定位"当前订单线对应的 BOM"。
 *
 * 思路 3 重构后,同一 productId 可有多份 RELEASED MBOM(不同 versionLevel / 客户),
 * 必须显式带上客户上下文才能选到正确那份。
 */
export interface ActiveBOMWeightProbe {
  productId: string
  customerId?: string
}

function probeKey(probe: ActiveBOMWeightProbe): string {
  return `${probe.productId}::${(probe.customerId ?? '').trim()}`
}

/**
 * 批量按 (productId, customerId) 查询当前 RELEASED BOM 的重量。
 *
 * 方案 B + 思路 3 重构: 销售订单打包预览 / packaging-profile 等场景需要在一次渲染里
 * 拿到一组 (产品, 客户) 元组的"当前权威重量",避免给每行都挂一个 useActiveBOM。
 *
 * 实现: 复用 React Query 的 useQueries,每个 productId 一个独立 query(同 productId
 * 不同 customer 共享缓存,客户匹配在内存里完成,降低请求数)。
 *   - 同 productId 跨页面共享缓存
 *   - 单个 BOM 失败不影响其他产品的展示
 *   - probes 为空时返回空 map,零 fetch
 *
 * 返回 Map 的 key 是 `${productId}::${customerId}` 字符串,需要用 `getActiveBOMWeight()` 辅助查找。
 */
export function useActiveBOMWeightMap(
  probes: ReadonlyArray<ActiveBOMWeightProbe | null | undefined>
): Map<string, ActiveBOMWeightInfo> {
  // 去重 + 去空,按 productId 字典序稳定,避免数组身份波动触发 useQueries 重建。
  const normalizedProbes = useMemo(() => {
    const seen = new Set<string>()
    const result: ActiveBOMWeightProbe[] = []
    for (const raw of probes) {
      if (!raw) continue
      const productId = (raw.productId ?? '').trim()
      if (!productId) continue
      const key = probeKey({ productId, customerId: raw.customerId })
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ productId, customerId: raw.customerId?.trim() || undefined })
    }
    result.sort((a, b) => a.productId.localeCompare(b.productId) || (a.customerId ?? '').localeCompare(b.customerId ?? ''))
    return result
  }, [probes])

  // 同 productId 不同 customerId 共享一次 BOM list 拉取,客户匹配在内存里做。
  const uniqueProductIds = useMemo(
    () => Array.from(new Set(normalizedProbes.map((p) => p.productId))).sort(),
    [normalizedProbes]
  )

  const queries = useQueries({
    queries: uniqueProductIds.map((productId) => ({
      queryKey: [...bomQueryKeys.list(), { productId }] as const,
      queryFn: () => bomService.getBOMs({ productId }),
    })),
  })

  // 把失败 query 当作 weight 不可用,但不抛出(packaging 链路应优雅降级 + warning)。
  useEffect(() => {
    queries.forEach((q, idx) => {
      if (q.isError && q.error) {
        // eslint-disable-next-line no-console
        console.warn(
          '[useActiveBOMWeightMap] BOM query failed for productId',
          uniqueProductIds[idx],
          q.error
        )
      }
    })
  }, [queries, uniqueProductIds])

  return useMemo(() => {
    const queryByProductId = new Map<string, BOM[] | undefined>()
    queries.forEach((q, idx) => {
      const productId = uniqueProductIds[idx]
      if (!productId) return
      if (q.isPending || q.isError || !q.data) {
        queryByProductId.set(productId, undefined)
        return
      }
      queryByProductId.set(productId, q.data)
    })

    const map = new Map<string, ActiveBOMWeightInfo>()
    for (const probe of normalizedProbes) {
      const key = probeKey(probe)
      const boms = queryByProductId.get(probe.productId)
      if (!boms) {
        map.set(key, EMPTY_WEIGHT)
        continue
      }
      const released = pickReleasedBOM(boms, { customerId: probe.customerId })
      if (!released || !released.measuredWeight || released.measuredWeight <= 0) {
        map.set(key, EMPTY_WEIGHT)
        continue
      }
      map.set(key, {
        weight: released.measuredWeight,
        unit: (released.measuredWeightUnit || '').trim(),
        available: true,
      })
    }
    return map
  }, [queries, normalizedProbes, uniqueProductIds])
}

/** 从 useActiveBOMWeightMap 返回的 map 中安全读取某个 (productId, customerId) 的重量。 */
export function getActiveBOMWeight(
  map: Map<string, ActiveBOMWeightInfo>,
  productId: string | null | undefined,
  customerId?: string | null
): ActiveBOMWeightInfo {
  const trimmedProductId = (productId ?? '').trim()
  if (!trimmedProductId) return EMPTY_WEIGHT
  return map.get(probeKey({ productId: trimmedProductId, customerId: customerId ?? undefined })) ?? EMPTY_WEIGHT
}
