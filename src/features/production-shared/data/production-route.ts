import type { ProductionBOMBranch } from './production-bom-branch'
import type { ProductionBOMBranchOperation } from './production-line'

export const productionRouteStatuses = ['DRAFT', 'PUBLISHED'] as const
export const productionRouteScopeTypes = [
  'BRANCH_DEFAULT',
  'SALES_ORDER_LINE',
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
export type ProductionRouteScopeType = (typeof productionRouteScopeTypes)[number]
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
}

export type ProductionRouteQualityRouting = Record<
  string,
  ProductionRouteQualityRoutingTarget
>

export interface ProductionRouteStep {
  id: string
  routeId?: string
  sequence: number
  branchOperationId: string
  processLibraryId?: string
  branchOperationName?: string
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
  routeFamilyId: string
  revisionNo: number
  basedOnRouteId: string
  isCurrentRevision: boolean
  code: string
  name: string
  productId: string
  productSKU?: string
  productName: string
  bomOwnerType?: string
  bomOwnerCustomerId?: string
  bomOwnerCustomerName?: string
  bomVersionLevel?: string
  scopeType: ProductionRouteScopeType
  salesOrderLineId?: number
  salesOrderNo?: string
  salesOrderLineNo?: number
  description: string
  version: number
  status: ProductionRouteStatus
  steps: ProductionRouteStep[]
  createdAt: string
  updatedAt: string
}

export type { ProductionBOMBranch } from './production-bom-branch'
export interface ProductionRouteBOMBranch extends ProductionBOMBranch {
  branchOperations: ProductionBOMBranchOperation[]
}

export interface ProductionRouteSalesOrderLineCandidate {
  id: number
  salesOrderId: string
  salesOrderNo: string
  customerName: string
  lineNo: number
  productId: string
  productModel: string
  productCode: string
  specification: string
}
export { getProductionBOMBranchIdentityKey as getProductionRouteBOMBranchIdentityKey } from './production-bom-branch'
