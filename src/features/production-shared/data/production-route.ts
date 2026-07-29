export const productionRouteStatuses = [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
] as const

export const productionRouteExecutionModes = [
  'IN_HOUSE',
  'OUTSOURCE_ALLOWED',
  'OUTSOURCE_REQUIRED',
] as const

export const productionRouteQualityGates = [
  'NONE',
  'OPTIONAL',
  'REQUIRED',
] as const

export type ProductionRouteStatus = (typeof productionRouteStatuses)[number]
export type ProductionRouteExecutionMode =
  (typeof productionRouteExecutionModes)[number]
export type ProductionRouteQualityGate =
  (typeof productionRouteQualityGates)[number]
export const productionRouteQualityDispositions = [
  'ACCEPT',
  'CONCESSION',
  'REWORK',
  'SCRAP',
] as const
export type ProductionRouteQualityDisposition =
  (typeof productionRouteQualityDispositions)[number]

export interface ProductionRouteQualityRoutingTarget {
  targetRouteStepId?: string
  targetProcessStepId?: string
}

export type ProductionRouteQualityRouting = Record<
  string,
  ProductionRouteQualityRoutingTarget
>

export interface ProductionRouteStep {
  id: string
  routeId?: string
  sequence: number
  segmentId: string
  segmentName?: string
  processStepId: string
  processCode?: string
  processName?: string
  executionMode: ProductionRouteExecutionMode
  qualityGate: ProductionRouteQualityGate
  qualityRouting?: ProductionRouteQualityRouting
  estimatedMinutes: number
  transferRequired: boolean
  description: string
  createdAt?: string
  updatedAt?: string
}

export interface ProductionRoute {
  id: string
  code: string
  name: string
  productId: string
  productName: string
  productTemplateId: string
  description: string
  version: number
  status: ProductionRouteStatus
  steps: ProductionRouteStep[]
  createdAt: string
  updatedAt: string
}
