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

export interface ProductionBOMBranchOperationApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  productId: string
  bomOwnerType: 'INTERNAL' | 'CUSTOMER'
  bomOwnerCustomerId: string
  bomVersionLevel: string
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
  processLibraryId?: string
}

export interface ProductionLineSegmentApiDTO {
  id: string
  lineId?: string
  name: string
  productId: string
  productSKU?: string
  productName?: string
  bomOwnerType?: string
  bomOwnerCustomerId?: string
  bomOwnerCustomerName?: string
  bomVersionLevel?: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown> | null
  processes: ProductionProcessStepApiDTO[]
  branchOperations: ProductionBOMBranchOperationApiDTO[]
  createdAt?: string
  updatedAt?: string
}

export interface ProductionLineApiDTO {
  id: string
  code: string
  name: string
  productTemplateId?: string
  description: string
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  segments: ProductionLineSegmentApiDTO[]
}

export interface ProductionLineProductTemplateApiDTO {
  id: string
  name: string
  code: string
  active: boolean
}

export interface ProductionLineProductTemplatesResponseApiDTO {
  items: ProductionLineProductTemplateApiDTO[]
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
  branchOperationId: string
  processLibraryId?: string
  branchOperationName?: string
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
}

export interface ProductionRouteSalesOrderLineCandidatesResponseApiDTO {
  items: ProductionRouteSalesOrderLineCandidateApiDTO[]
}

export interface ProductionRouteBOMBranchApiDTO {
  productId: string
  productSKU: string
  productName: string
  bomOwnerType: 'INTERNAL' | 'CUSTOMER'
  bomOwnerCustomerId: string
  bomOwnerCustomerName: string
  bomVersionLevel: string
  branchOperations: ProductionBOMBranchOperationApiDTO[]
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

export interface SaveProductionLineApiDTO extends ProductionLineApiDTO {
  authCode?: string
}

export type SaveProductionRouteApiDTO = ProductionRouteApiDTO

export type SaveProductionProcessStepApiDTO = ProductionProcessStepApiDTO

export type SaveProductionBOMBranchOperationApiDTO =
  ProductionBOMBranchOperationApiDTO
