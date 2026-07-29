export const productionOutsourceStatuses = [
  'RELEASED',
  'SENT',
  'RETURNED',
  'INSPECTION_ACCEPTED',
  'INSPECTION_CONCESSION',
  'INSPECTION_REWORK',
  'INSPECTION_SCRAP',
  'CLOSED',
  'CANCELED',
] as const

export type ProductionOutsourceStatus =
  (typeof productionOutsourceStatuses)[number]

export function isProductionOutsourceStatus(
  value: string
): value is ProductionOutsourceStatus {
  return productionOutsourceStatuses.includes(
    value as ProductionOutsourceStatus
  )
}

export function normalizeProductionOutsourceStatus(
  value: string
): ProductionOutsourceStatus {
  const normalized = value.trim().toUpperCase()
  if (!isProductionOutsourceStatus(normalized)) {
    throw new Error(`Invalid production outsource status: ${value}`)
  }
  return normalized
}
