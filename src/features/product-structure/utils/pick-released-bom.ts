/**
 * 思路 3 重构后,同一 productId 可同时存在多份 RELEASED BOM(不同 versionLevel/customer)。
 * 这个工具集中"按 (customerId, versionLevel) 选取代表性 BOM" 的策略,供
 * useActiveBOM / useActiveBOMWeightMap / 其他展示场景共用。
 *
 * 优先级: CUSTOMER 专供 → INTERNAL 兜底; 同档同归属下取 createdAt 最新一份。
 */

import { type BOM } from '../data/schema'

export interface BOMSelector {
  /** 客户专供 BOM 优先匹配此 customerId(为空时直接走 INTERNAL) */
  customerId?: string
  /** 进一步按 versionLevel 过滤(为空时跨档次取最新创建一份) */
  versionLevel?: string
}

export function byCreatedAtDesc(a: BOM, b: BOM): number {
  const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
  const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
  return bTime - aTime
}

function trimSelector(selector?: BOMSelector): { customerId: string; versionLevel: string } {
  return {
    customerId: (selector?.customerId ?? '').trim(),
    versionLevel: (selector?.versionLevel ?? '').trim(),
  }
}

/**
 * 在已经按 (bomType, status) 过滤出的候选 BOM 列表里,根据 selector 选一份最合适的。
 *
 * 选择策略:
 *   1. 若指定 customerId,优先匹配 ownerType='CUSTOMER' && ownerCustomerId=customerId
 *   2. fallback 到 ownerType='INTERNAL'(或未设置默认 INTERNAL)
 *   3. 若指定 versionLevel,在上一步结果里再过滤
 *   4. 跨档次 / 多份候选时取 createdAt 最新一份
 *
 * 返回 undefined 表示候选里没有任何匹配项。
 */
export function pickBOMBySelector(candidates: BOM[], selector?: BOMSelector): BOM | undefined {
  const { customerId, versionLevel } = trimSelector(selector)

  // 1. 客户专供优先
  if (customerId) {
    const customerCandidates = filterByVersionLevel(
      candidates.filter((bom) => bom.ownerType === 'CUSTOMER' && (bom.ownerCustomerId ?? '').trim() === customerId),
      versionLevel
    )
    if (customerCandidates.length > 0) {
      return customerCandidates.sort(byCreatedAtDesc)[0]
    }
  }

  // 2. INTERNAL 兜底
  const internalCandidates = filterByVersionLevel(
    candidates.filter((bom) => (bom.ownerType ?? 'INTERNAL') === 'INTERNAL'),
    versionLevel
  )
  return internalCandidates.sort(byCreatedAtDesc)[0]
}

function filterByVersionLevel(boms: BOM[], versionLevel: string): BOM[] {
  if (!versionLevel) return boms
  return boms.filter((bom) => (bom.versionLevel ?? '').trim() === versionLevel)
}

/**
 * 按 selector 选 RELEASED 的 (MBOM 优先,EBOM 兜底) 中代表性那份。
 *
 * 用于产品概览/包装重量这种"展示当前生效 BOM"场景。
 */
export function pickReleasedBOM(boms: BOM[], selector?: BOMSelector): BOM | undefined {
  const releasedMboms = boms.filter((bom) => bom.bomType === 'MBOM' && bom.status === 'RELEASED')
  const mbom = pickBOMBySelector(releasedMboms, selector)
  if (mbom) return mbom

  const releasedEboms = boms.filter((bom) => bom.bomType === 'EBOM' && bom.status === 'RELEASED')
  return pickBOMBySelector(releasedEboms, selector)
}
