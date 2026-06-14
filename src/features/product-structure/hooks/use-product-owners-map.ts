'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCustomers } from '@/features/trading/customer'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { BOMS_QUERY_KEY } from '../query-keys'
import { bomService } from '../services/bom-service'

export interface ProductOwnerEntry {
  type: 'INTERNAL' | 'CUSTOMER'
  customerId?: string
  /** 客户专供时的客户显示名;customer 缺失时 undefined */
  customerName?: string
  /** 拼接 type + customerId 的稳定 key,UI 渲染 list key 用 */
  dedupKey: string
}

/**
 * 按产品聚合"归属覆盖"。
 *
 * 方案 B + 1:1：归属语义在 BOM 维度。一个产品可能有多份 BOM
 * （EBOM + MBOM,或客户特供 + 内部）,每份 BOM 各自归属。
 * 本 hook 一次拉全量 BOM,在内存里按 productId 分组、去重。
 *
 * 排除 OBSOLETE 状态,避免显示已废弃 BOM 的历史归属。
 *
 * 缓存：直接复用 BOMS_QUERY_KEY,与 BOM 管理页共享(BOM 列表 / sidebar
 * 都吃同一份缓存,一处刷新全局生效)。
 */
export function useProductOwnersMap(): {
  map: Map<string, ProductOwnerEntry[]>
  isLoading: boolean
  isError: boolean
} {
  const bomsQuery = useQuery({
    queryKey: BOMS_QUERY_KEY,
    queryFn: () => bomService.getBOMs(),
  })
  const customersQuery = useQuery({
    queryKey: tradingQueryKeys.customers(),
    queryFn: getCustomers,
  })

  const customerNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of customersQuery.data ?? []) {
      m.set(c.id, c.name)
    }
    return m
  }, [customersQuery.data])

  const map = useMemo(() => {
    const result = new Map<string, ProductOwnerEntry[]>()
    for (const bom of bomsQuery.data ?? []) {
      // 跳过 OBSOLETE,避免历史废弃 BOM 污染卡片视觉
      if (bom.status === 'OBSOLETE') continue
      const productId = bom.productId
      if (!productId) continue

      const ownerType = bom.ownerType ?? 'INTERNAL'
      const customerId = bom.ownerCustomerId?.trim() || undefined
      const dedupKey = `${ownerType}::${customerId ?? ''}`

      const existing = result.get(productId)
      if (existing) {
        if (existing.some((e) => e.dedupKey === dedupKey)) continue
        existing.push({
          type: ownerType,
          customerId,
          customerName: customerId
            ? customerNameMap.get(customerId)
            : undefined,
          dedupKey,
        })
      } else {
        result.set(productId, [
          {
            type: ownerType,
            customerId,
            customerName: customerId
              ? customerNameMap.get(customerId)
              : undefined,
            dedupKey,
          },
        ])
      }
    }
    // 排序: 内部排第一,客户按 customerName 字典序
    for (const entries of result.values()) {
      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'INTERNAL' ? -1 : 1
        const an = a.customerName ?? ''
        const bn = b.customerName ?? ''
        return an.localeCompare(bn)
      })
    }
    return result
  }, [bomsQuery.data, customerNameMap])

  return {
    map,
    isLoading: bomsQuery.isLoading || customersQuery.isLoading,
    isError: bomsQuery.isError || customersQuery.isError,
  }
}
