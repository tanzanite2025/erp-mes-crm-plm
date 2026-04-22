export const productionPlanStatuses = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const

export type ProductionPlanStatus = (typeof productionPlanStatuses)[number]

export function isProductionPlanStatus(
  value: string
): value is ProductionPlanStatus {
  return productionPlanStatuses.includes(value as ProductionPlanStatus)
}

export function normalizeProductionPlanStatus(
  value: string
): ProductionPlanStatus {
  if (!isProductionPlanStatus(value)) {
    throw new Error(`Invalid production plan status: ${value}`)
  }
  return value
}
