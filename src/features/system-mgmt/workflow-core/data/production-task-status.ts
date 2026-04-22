export const productionTaskStatuses = [
  'PENDING',
  'RUNNING',
  'HOLD',
  'DONE',
] as const

export type ProductionTaskStatus = (typeof productionTaskStatuses)[number]

export function isProductionTaskStatus(
  value: string
): value is ProductionTaskStatus {
  return productionTaskStatuses.includes(value as ProductionTaskStatus)
}

export function normalizeProductionTaskStatus(
  value: string
): ProductionTaskStatus {
  const normalized = value.trim().toUpperCase()
  if (!isProductionTaskStatus(normalized)) {
    throw new Error(`Invalid production task status: ${value}`)
  }
  return normalized
}
