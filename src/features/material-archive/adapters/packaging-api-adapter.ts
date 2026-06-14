import type {
  PackagingRuleApiDTO,
  SavePackagingRuleApiDTO,
} from '../contracts/packaging-api-dto'
import type { PackagingRule } from '../data/schema'

export type SavePackagingRuleInput = {
  id?: string
  materialId: string
  packUnit: string
  baseUnit: string
  conversionFactor: number
  direction: PackagingRule['direction']
}

export function toPackagingRuleContract(
  dto: PackagingRuleApiDTO
): PackagingRule {
  return {
    id: dto.id,
    materialId: dto.materialId,
    packUnit: dto.packUnit,
    baseUnit: dto.baseUnit,
    conversionFactor: Number(dto.conversionFactor) || 0,
    direction: dto.direction || 'forward',
    updatedAt: dto.updatedAt || '',
  }
}

export function toPackagingRuleContracts(
  dtos: PackagingRuleApiDTO[]
): PackagingRule[] {
  return dtos.map(toPackagingRuleContract)
}

export function toSavePackagingRuleApiDTO(
  rule: SavePackagingRuleInput
): SavePackagingRuleApiDTO {
  return {
    id: rule.id || undefined,
    materialId: rule.materialId,
    packUnit: rule.packUnit,
    baseUnit: rule.baseUnit,
    conversionFactor: Number(rule.conversionFactor) || 0,
    direction: rule.direction,
  }
}
