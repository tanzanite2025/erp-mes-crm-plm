'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type BOM } from '../data/schema'
import { bomQueryKeys } from '../query-keys'
import { bomService } from '../services/bom-service'
import {
  byCreatedAtDesc,
  pickReleasedBOM,
  type BOMSelector,
} from '../utils/pick-released-bom'

export type ActiveBOMStatus =
  | 'loading'
  | 'released'
  | 'draft'
  | 'none'
  | 'error'

/**
 * 一个产品在某个时刻的"激活 BOM"。
 *
 * 方案 B + 思路 3 重构: BOM 是产品最终重量 + 版本的端到端权威源。
 *  - 优先返回 status=RELEASED 的 MBOM(生产口径)
 *  - 次选 status=RELEASED 的 EBOM(设计口径,未派生 MBOM 时)
 *  - 再次选最新草稿 EBOM(用 createdAt 倒序,仅展示用,不发布)
 *  - 都没有 → none,UI 应展示"尚未建 BOM"指引
 *
 * 思路 3 后,同一 productId 可同时存在多份 RELEASED BOM(不同 versionLevel/customer)。
 * 调用方应通过 selector 显式选择(如订单履约场景按 customerId/versionLevel 反查)。
 * 不传 selector 时按"INTERNAL 优先,跨档次取最新创建那份"作为产品级代表性 BOM。
 */
export interface ActiveBOMResource {
  status: ActiveBOMStatus
  /** RELEASED 通路；none/loading/error 时为 undefined */
  bom?: BOM
  /** status=draft 时携带的最新草稿 BOM；其他 status 为 undefined */
  draftBom?: BOM
  error?: unknown
}

export type ActiveBOMSelector = BOMSelector

function pickLatestDraft(boms: BOM[]): BOM | undefined {
  return boms
    .filter((bom) => bom.status !== 'RELEASED' && bom.status !== 'OBSOLETE')
    .sort(byCreatedAtDesc)[0]
}

/**
 * 按产品 ID 拉取该产品的 BOM 列表,并根据 selector 选出当前"激活"的版本。
 *
 * 读 BOMS_QUERY_KEY 的子查询(带 productId 过滤),与 BOMMgmt 的全量列表互不影响。
 * 没有 productId 时立即返回 none,避免无意义 fetch。
 */
export function useActiveBOM(
  productId: string | undefined | null,
  selector?: ActiveBOMSelector
): ActiveBOMResource {
  const trimmedId = (productId ?? '').trim()

  const query = useQuery({
    queryKey: [...bomQueryKeys.list(), { productId: trimmedId }] as const,
    queryFn: () => bomService.getBOMs({ productId: trimmedId }),
    enabled: trimmedId.length > 0,
  })

  return useMemo<ActiveBOMResource>(() => {
    if (!trimmedId) return { status: 'none' }
    if (query.isPending) return { status: 'loading' }
    if (query.isError) return { status: 'error', error: query.error }

    const boms = query.data ?? []
    const released = pickReleasedBOM(boms, selector)
    if (released) return { status: 'released', bom: released }

    const draft = pickLatestDraft(boms)
    if (draft) return { status: 'draft', draftBom: draft }

    return { status: 'none' }
  }, [
    trimmedId,
    query.isPending,
    query.isError,
    query.data,
    query.error,
    selector?.customerId,
    selector?.versionLevel,
  ])
}
