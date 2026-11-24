import type { ProductionBOMBranch } from './production-bom-branch'
import type { ProductionProcessStep } from './production-process'

export type { ProductionProcessStep } from './production-process'

export interface ProductionSegment {
  id: string
  name: string
  productId?: string
  productSKU?: string
  productName?: string
  bomOwnerType?: string
  bomOwnerCustomerId?: string
  bomOwnerCustomerName?: string
  bomVersionLevel?: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown>
  processes: ProductionProcessStep[]
  updatedAt?: string
}

export interface ProductionLineSegment extends ProductionSegment {
  productId: string
  branchOperations?: ProductionBOMBranchOperation[]
}

export interface ProductionBOMBranchOperation {
  id: string
  productId: string
  bomOwnerType: 'INTERNAL' | 'CUSTOMER'
  bomOwnerCustomerId: string
  bomVersionLevel: string
  name: string
  description: string
  sortOrder: number
  isActive: boolean
  processLibraryId?: string
  createdAt?: string
  updatedAt?: string
}

export type ProductionLineBOMBranch = ProductionBOMBranch

export interface ProductionLine {
  id: string
  code: string
  name: string
  productTemplateId?: string
  description: string
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  segments: ProductionLineSegment[]
}

export interface ProductionLineProductTemplate {
  id: string
  name: string
  code: string
  active: boolean
}

export interface ProductionTopologyTemplate {
  id: string
  name: string
  description?: string
  version: number
  snapshot: ProductionTopologyTemplateSnapshot
  createdAt: string
  updatedAt: string
}

export interface ProductionTopologyTemplateBranchSnapshot {
  productId: string
  bomOwnerType: 'INTERNAL' | 'CUSTOMER'
  bomOwnerCustomerId: string
  bomVersionLevel: string
  name: string
  productSKU: string
  description: string
  attributes: Record<string, unknown> | null
  operationReferences: {
    name: string
    description: string
    sortOrder: number
    isActive: boolean
  }[]
}

export interface ProductionTopologyTemplateSnapshot {
  productTemplateId: string
  productTemplateName: string
  sourceLineCode: string
  lineDescription: string
  branches: ProductionTopologyTemplateBranchSnapshot[]
}
