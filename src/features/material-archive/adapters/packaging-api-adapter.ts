import type { PackagingRule } from '../data/schema'
import type {
  PackagingRuleApiDTO,
  SavePackagingRuleApiDTO,
} from '../contracts/packaging-api-dto'

export function toPackagingRuleContract(dto: PackagingRuleApiDTO): PackagingRule {
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

export function toPackagingRuleContracts(dtos: PackagingRuleApiDTO[]): PackagingRule[] {
  return dtos.map(toPackagingRuleContract)
}

export function toSavePackagingRuleApiDTO(rule: Partial<PackagingRule>): SavePackagingRuleApiDTO {
  return {
    id: rule.id || undefined,
    materialId: rule.materialId || '',
    packUnit: rule.packUnit || '',
    baseUnit: rule.baseUnit || '',
    conversionFactor: Number(rule.conversionFactor) || 0,
    direction: rule.direction || 'forward',
  }
}
