export interface ProductionProcessStepApiDTO {
  id: string
  code?: string
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProductionLineApiDTO {
  id: string
  code: string
  name: string
  description: string
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductionLinesResponseApiDTO {
  items: ProductionLineApiDTO[]
}

export interface ProductionRouteStepApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  routeId?: string
  sequence: number
  processStepId: string
  processName?: string
  processDescription?: string
  executionMode: string
  qualityGate: string
  qualityRouting?: Record<
    string,
    ProductionRouteQualityRoutingTargetApiDTO
  > | null
  estimatedMinutes: number
  transferRequired: boolean
  description?: string
}

export interface ProductionRouteQualityRoutingTargetApiDTO {
  targetRouteStepId?: string
}

export interface ProductionRouteApiDTO {
  id: string
  routeFamilyId: string
  revisionNo: number
  basedOnRouteId?: string
  isCurrentRevision: boolean
  createdAt?: string
  updatedAt?: string
  code: string
  name: string
  productId?: string
  productSKU?: string
  productName?: string
  bomOwnerType?: string
  bomOwnerCustomerId?: string
  bomOwnerCustomerName?: string
  bomVersionLevel?: string
  scopeType: 'BRANCH_DEFAULT' | 'SALES_ORDER_LINE'
  salesOrderLineId?: number
  salesOrderNo?: string
  salesOrderLineNo?: number
  description?: string
  version: number
  status: string
  steps: ProductionRouteStepApiDTO[]
}

export interface ProductionRouteSalesOrderLineCandidateApiDTO {
  id: number
  salesOrderId: string
  salesOrderNo: string
  customerName: string
  lineNo: number
  productId: string
  productModel: string
  productCode: string
  specification: string
  bomOwnerType: string
  bomOwnerCustomerId: string
  bomVersionLevel: string
  productionRouteMode: 'DEFAULT' | 'CUSTOM'
  hasProductionRoute: boolean
}

export interface ProductionRouteSalesOrderLineCandidatesResponseApiDTO {
  items: ProductionRouteSalesOrderLineCandidateApiDTO[]
}

export interface ProductionRouteBOMBranchApiDTO {
  productId: string
  productSKU: string
  productName: string
  productTypeName?: string
  bomOwnerType: 'INTERNAL' | 'CUSTOMER'
  bomOwnerCustomerId: string
  bomOwnerCustomerName: string
  bomVersionLevel: string
  processes: ProductionProcessStepApiDTO[]
}

export interface ProductionRouteBOMBranchesResponseApiDTO {
  items: ProductionRouteBOMBranchApiDTO[]
}

export interface ProductionRoutesResponseApiDTO {
  items: ProductionRouteApiDTO[]
}

export interface ProductionProcessStepsResponseApiDTO {
  items: ProductionProcessStepApiDTO[]
}

export interface ProductionMessageApiDTO {
  message: string
}

export type SaveProductionLineApiDTO = ProductionLineApiDTO

export type SaveProductionRouteApiDTO = ProductionRouteApiDTO

export type SaveProductionProcessStepApiDTO = ProductionProcessStepApiDTO
