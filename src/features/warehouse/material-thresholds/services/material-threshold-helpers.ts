import type { QueryClient } from '@tanstack/react-query'
import { warehouseQueryKeys } from '../../query-keys'
import {
  type InventoryThresholdRule,
  type InventoryThresholdRuleWritePayload,
} from '../data/schema'
import { InventoryThresholdService } from './inventory-threshold-service'

/**
 * 查找指定物料当前对应的 MATERIAL 阈值规则。
 */
export function findMaterialThresholdRule(
  rules: InventoryThresholdRule[] | undefined,
  materialId?: string | null
): InventoryThresholdRule | null {
  if (!materialId) {
    return null
  }

  return (
    rules?.find((rule) => rule.targetType === 'MATERIAL' && rule.materialId === materialId) ?? null
  )
}

/**
 * 将启用中的 MATERIAL 阈值规则归并为以物料 ID 为键的映射。
 */
export function buildMaterialThresholdMap(
  rules: InventoryThresholdRule[] | undefined
): Record<string, number> {
  return (rules ?? []).reduce<Record<string, number>>((acc, rule) => {
    if (rule.targetType !== 'MATERIAL' || !rule.enabled || !rule.materialId) {
      return acc
    }

    acc[rule.materialId] = rule.thresholdQty
    return acc
  }, {})
}

/**
 * 按物料维度执行阈值规则的更新或创建。
 */
export async function upsertMaterialThresholdRule(
  rules: InventoryThresholdRule[] | undefined,
  materialId: string,
  payload: InventoryThresholdRuleWritePayload
): Promise<InventoryThresholdRule> {
  const existingRule = findMaterialThresholdRule(rules, materialId)

  if (existingRule) {
    return InventoryThresholdService.updateRule(existingRule.id, payload)
  }

  return InventoryThresholdService.createRule(payload)
}

/**
 * 统一失效仓储阈值相关的查询缓存。
 */
export async function invalidateMaterialThresholdState(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.thresholdRules() }),
    queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.materialThresholdMap() }),
    queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryAlertSummary() }),
  ])
}
