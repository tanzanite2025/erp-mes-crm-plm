/**
 * BOMIdentity — BOM 业务键封装。
 *
 * 概念：BOM 的"同一性"在业务层并非由数据库自增 ID 决定，而是由"产品 × 版本 × 类型"
 * 三元组（未来可扩展为四元组：再加上 customerId）唯一确定。
 *
 * 这个文件的职责是把分散在 page/hook/service 各处的 productId/bomVersion/bomType
 * 字段对比与字符串拼接收敛成一组单一来源的工具函数。
 *
 * 用法约定：
 * - 只要业务上需要"判断两条 BOM 是否同一身份"——使用 {@link bomIdentitiesEqual}
 * - 只要需要把身份写入日志、消息、UI 标签——使用 {@link formatBOMIdentity}
 * - 只要从一个完整的 BOM 提取业务键——使用 {@link extractBOMIdentity}
 * - 只要判断 BOM 类型（EBOM / MBOM）——使用 {@link isEBOM} / {@link isMBOM}
 *
 * 这个文件刻意保持纯逻辑，不引入 React/i18n 依赖，确保前后端可移植。
 */
import { type BOM } from '../data/schema'

/**
 * BOM 业务键。
 *
 * 当前定义：productId × bomVersion × bomType。
 *
 * 注意：未来要接入"客户定制 BOM"时，本类型会扩展为四元组（再加 customerId）。
 * 所有读取业务键的地方都应通过 {@link extractBOMIdentity} 获取，避免直接访问字段，
 * 这样到时候只改这一个文件即可全局生效。
 */
export interface BOMIdentity {
  productId: string
  bomVersion: string
  bomType: 'EBOM' | 'MBOM'
}

/**
 * 已经具体化的 BOM 实例指纹。包含数据库 ID。
 *
 * 用于已知具体行的"实例引用"场景（例：删除/锁定/锚定到一行）；
 * 当业务只关心"哪个产品的哪个版本"，不关心具体行 ID 时使用 {@link BOMIdentity}。
 */
export interface BOMVersionFingerprint extends BOMIdentity {
  id: string
}

const VALID_BOM_TYPES = new Set<BOMIdentity['bomType']>(['EBOM', 'MBOM'])

function normalizeBomTypeStrict(value: unknown): BOMIdentity['bomType'] {
  const normalized = (typeof value === 'string' ? value : '')
    .trim()
    .toUpperCase()
  if (VALID_BOM_TYPES.has(normalized as BOMIdentity['bomType'])) {
    return normalized as BOMIdentity['bomType']
  }
  return 'EBOM'
}

/**
 * 从 BOM 实体提取业务键。
 *
 * 字段缺失时使用空字符串占位（保持 type 一致），调用方在业务比较前应自行判空。
 */
export function extractBOMIdentity(
  bom: Pick<BOM, 'productId' | 'bomVersion' | 'bomType'>
): BOMIdentity {
  return {
    productId: bom.productId ?? '',
    bomVersion: bom.bomVersion ?? '',
    bomType: normalizeBomTypeStrict(bom.bomType),
  }
}

/**
 * 提取已实例化的 BOM 指纹（含 id）。
 */
export function extractBOMVersionFingerprint(
  bom: Pick<BOM, 'id' | 'productId' | 'bomVersion' | 'bomType'>
): BOMVersionFingerprint {
  return {
    id: bom.id ?? '',
    ...extractBOMIdentity(bom),
  }
}

/**
 * 业务键相等判断。
 *
 * 三元组逐字段对比，bomType 经过规范化（容错大小写/空格）。
 */
export function bomIdentitiesEqual(a: BOMIdentity, b: BOMIdentity): boolean {
  return (
    a.productId === b.productId &&
    a.bomVersion === b.bomVersion &&
    a.bomType === b.bomType
  )
}

/**
 * 把 BOM 业务键格式化为可读字符串，用于日志、消息、UI 标签。
 *
 * 输出形如 `EBOM/product-id-123/V1.0`。
 * UI 上需要友好显示时建议另用 `bomNo` + `bomVersion` 组合，本函数面向系统侧。
 */
export function formatBOMIdentity(identity: BOMIdentity): string {
  return `${identity.bomType}/${identity.productId}/${identity.bomVersion}`
}

/**
 * 判断 BOM 是否属于研发 BOM。
 */
export function isEBOM(
  bom: Pick<BOM, 'bomType'> | { bomType?: string | null } | null | undefined
): boolean {
  if (!bom) return false
  return normalizeBomTypeStrict(bom.bomType) === 'EBOM'
}

/**
 * 判断 BOM 是否属于生产 BOM。
 */
export function isMBOM(
  bom: Pick<BOM, 'bomType'> | { bomType?: string | null } | null | undefined
): boolean {
  if (!bom) return false
  return normalizeBomTypeStrict(bom.bomType) === 'MBOM'
}

/**
 * 在 BOM 列表中按业务键查找第一条匹配项。
 */
export function findBOMByIdentity<
  T extends Pick<BOM, 'productId' | 'bomVersion' | 'bomType'>,
>(list: readonly T[], identity: BOMIdentity): T | undefined {
  return list.find((bom) =>
    bomIdentitiesEqual(extractBOMIdentity(bom), identity)
  )
}

/**
 * 同 productId 的所有 BOM 过滤器（不区分版本与类型）。
 *
 * 用于"按产品筛选"等场景。
 */
export function filterBOMsByProductId<T extends Pick<BOM, 'productId'>>(
  list: readonly T[],
  productId: string | undefined | null
): T[] {
  if (!productId) return [...list]
  return list.filter((bom) => bom.productId === productId)
}
