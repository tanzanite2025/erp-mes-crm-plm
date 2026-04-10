export type PackagingDirectionApiDTO = 'forward' | 'reverse'

export interface PackagingRuleApiDTO {
  id: string
  materialId: string
  packUnit: string
  baseUnit: string
  conversionFactor: number
  direction: PackagingDirectionApiDTO
  updatedAt?: string
}

export interface SavePackagingRuleApiDTO {
  id?: string
  materialId: string
  packUnit: string
  baseUnit: string
  conversionFactor: number
  direction: PackagingDirectionApiDTO
}
