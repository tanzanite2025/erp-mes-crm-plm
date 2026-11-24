import type {
  SaveProductionBOMBranchOperationApiDTO,
  ProductionLineApiDTO,
  ProductionLineProductTemplateApiDTO,
  ProductionLineSegmentApiDTO,
  ProductionBOMBranchOperationApiDTO,
  ProductionLinesResponseApiDTO,
  ProductionProcessStepApiDTO,
  ProductionProcessStepsResponseApiDTO,
  ProductionRouteApiDTO,
  ProductionRouteBOMBranchApiDTO,
  ProductionRoutesResponseApiDTO,
  ProductionRouteStepApiDTO,
  SaveProductionLineApiDTO,
  SaveProductionProcessStepApiDTO,
  SaveProductionRouteApiDTO,
} from '../contracts/production-resource-api-dto'
import type {
  ProductionLine,
  ProductionLineProductTemplate,
  ProductionLineSegment,
  ProductionBOMBranchOperation,
} from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'
import type {
  ProductionRouteBOMBranch,
  ProductionRoute,
  ProductionRouteExecutionMode,
  ProductionRouteQualityGate,
  ProductionRouteQualityRouting,
  ProductionRouteStatus,
  ProductionRouteStep,
} from '../data/production-route'
import {
  normalizeProductionLineCode,
  normalizeProductionProcessStepCode,
} from '../utils/production-code-normalization'

function toLineProcessContract(
  dto: ProductionProcessStepApiDTO
): ProductionProcessStep {
  return {
    id: dto.id,
    code: normalizeProductionProcessStepCode(dto.code),
    name: dto.name,
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    isActive: dto.isActive ?? true,
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
}

export function toProductionBOMBranchOperationContract(
  dto: ProductionBOMBranchOperationApiDTO
): ProductionBOMBranchOperation {
  return {
    id: dto.id,
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
    productId: dto.productId,
    bomOwnerType: dto.bomOwnerType,
    bomOwnerCustomerId: dto.bomOwnerCustomerId,
    bomVersionLevel: dto.bomVersionLevel,
    name: dto.name,
    description: dto.description || '',
    sortOrder: dto.sortOrder,
    isActive: dto.isActive,
    processLibraryId: dto.processLibraryId || undefined,
  }
}

export function toProductionProcessContract(
  dto: ProductionProcessStepApiDTO
): ProductionProcessStep {
  return toLineProcessContract(dto)
}

function toSegmentContract(
  dto: ProductionLineSegmentApiDTO
): ProductionLineSegment {
  return {
    id: dto.id,
    name: dto.name,
    productId: dto.productId,
    productSKU: dto.productSKU || '',
    productName: dto.productName || '',
    bomOwnerType: dto.bomOwnerType || '',
    bomOwnerCustomerId: dto.bomOwnerCustomerId || '',
    bomOwnerCustomerName: dto.bomOwnerCustomerName || '',
    bomVersionLevel: dto.bomVersionLevel || '',
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    attributes: dto.attributes || undefined,
    processes: (dto.processes || []).map(toLineProcessContract),
    branchOperations: (dto.branchOperations || []).map(
      toProductionBOMBranchOperationContract
    ),
    updatedAt: dto.updatedAt || '',
  }
}

export function toProductionLineContract(
  dto: ProductionLineApiDTO
): ProductionLine {
  return {
    id: dto.id,
    code: normalizeProductionLineCode(dto.code),
    name: dto.name,
    description: dto.description || '',
    version: Number(dto.version) || 1,
    isActive: dto.isActive ?? true,
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
    segments: (dto.segments || []).map(toSegmentContract),
  }
}

export function toProductionLineProductTemplateContract(
  dto: ProductionLineProductTemplateApiDTO
): ProductionLineProductTemplate {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    active: dto.active,
  }
}

export function toProductionLineProductTemplateContracts(
  templates: ProductionLineProductTemplateApiDTO[]
): ProductionLineProductTemplate[] {
  return templates.map(toProductionLineProductTemplateContract)
}

export function toProductionLineContracts(
  dto: ProductionLinesResponseApiDTO
): ProductionLine[] {
  return (dto.items || []).map(toProductionLineContract)
}

function normalizeRouteStatus(value?: string): ProductionRouteStatus {
  if (value === 'DRAFT' || value === 'PUBLISHED') {
    return value
  }
  throw new Error(`Unsupported production route status: ${value || '(empty)'}`)
}

function normalizeRouteExecutionMode(
  value?: string
): ProductionRouteExecutionMode {
  if (value === 'OUTSOURCE_ALLOWED' || value === 'OUTSOURCE_REQUIRED') {
    return value
  }
  return 'IN_HOUSE'
}

function normalizeRouteQualityGate(value?: string): ProductionRouteQualityGate {
  if (value === 'OPTIONAL' || value === 'REQUIRED') {
    return value
  }
  return 'NONE'
}

function normalizeRouteQualityRouting(
  value: ProductionRouteStepApiDTO['qualityRouting']
): ProductionRouteQualityRouting | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const routing: ProductionRouteQualityRouting = {}
  for (const [disposition, target] of Object.entries(value)) {
    if (!target || typeof target !== 'object') {
      continue
    }
    const targetRouteStepId =
      typeof target.targetRouteStepId === 'string'
        ? target.targetRouteStepId.trim()
        : ''
    if (!targetRouteStepId) {
      continue
    }
    routing[disposition.toUpperCase()] = {
      targetRouteStepId,
    }
  }

  return Object.keys(routing).length > 0 ? routing : undefined
}

function toProductionRouteStepContract(
  dto: ProductionRouteStepApiDTO
): ProductionRouteStep {
  return {
    id: dto.id,
    routeId: dto.routeId || '',
    sequence: Number(dto.sequence) || 1,
    branchOperationId: dto.branchOperationId || '',
    processLibraryId: dto.processLibraryId || '',
    branchOperationName: dto.branchOperationName || '',
    executionMode: normalizeRouteExecutionMode(dto.executionMode),
    qualityGate: normalizeRouteQualityGate(dto.qualityGate),
    qualityRouting: normalizeRouteQualityRouting(dto.qualityRouting),
    estimatedMinutes: Number(dto.estimatedMinutes) || 0,
    transferRequired: Boolean(dto.transferRequired),
    description: dto.description || '',
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
}

export function toProductionRouteContract(
  dto: ProductionRouteApiDTO
): ProductionRoute {
  return {
    id: dto.id,
    routeFamilyId: dto.routeFamilyId || '',
    revisionNo: Number(dto.revisionNo) || 1,
    basedOnRouteId: dto.basedOnRouteId || '',
    isCurrentRevision: dto.isCurrentRevision ?? false,
    code: dto.code || '',
    name: dto.name || '',
    productId: dto.productId || '',
    productSKU: dto.productSKU || '',
    productName: dto.productName || '',
    bomOwnerType: dto.bomOwnerType || '',
    bomOwnerCustomerId: dto.bomOwnerCustomerId || '',
    bomOwnerCustomerName: dto.bomOwnerCustomerName || '',
    bomVersionLevel: dto.bomVersionLevel || '',
    scopeType: dto.scopeType || 'BRANCH_DEFAULT',
    salesOrderLineId: dto.salesOrderLineId,
    salesOrderNo: dto.salesOrderNo,
    salesOrderLineNo: dto.salesOrderLineNo,
    description: dto.description || '',
    version: Number(dto.version) || 1,
    status: normalizeRouteStatus(dto.status),
    steps: (dto.steps || []).map(toProductionRouteStepContract),
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
}

export function toProductionRouteBOMBranchContract(
  dto: ProductionRouteBOMBranchApiDTO
): ProductionRouteBOMBranch {
  return {
    productId: dto.productId,
    productSKU: dto.productSKU,
    productName: dto.productName,
    bomOwnerType: dto.bomOwnerType,
    bomOwnerCustomerId: dto.bomOwnerCustomerId,
    bomOwnerCustomerName: dto.bomOwnerCustomerName,
    bomVersionLevel: dto.bomVersionLevel,
    branchOperations: (dto.branchOperations || []).map(
      toProductionBOMBranchOperationContract
    ),
  }
}

export function toProductionRouteBOMBranchContracts(
  branches: ProductionRouteBOMBranchApiDTO[]
): ProductionRouteBOMBranch[] {
  return branches.map(toProductionRouteBOMBranchContract)
}

export function toProductionRouteContracts(
  dto: ProductionRoutesResponseApiDTO
): ProductionRoute[] {
  return (dto.items || []).map(toProductionRouteContract)
}

export function toProductionProcessContracts(
  dto: ProductionProcessStepsResponseApiDTO
): ProductionProcessStep[] {
  return (dto.items || []).map(toProductionProcessContract)
}

function toProcessApiDTO(
  process: ProductionProcessStep
): ProductionProcessStepApiDTO {
  return {
    id: process.id,
    code: normalizeProductionProcessStepCode(process.code),
    name: process.name,
    description: process.description || '',
    sortOrder: process.sortOrder || 0,
    isActive: process.isActive ?? true,
    createdAt: process.createdAt || '',
    updatedAt: process.updatedAt || '',
  }
}

function toSegmentApiDTO(
  segment: ProductionLineSegment
): ProductionLineSegmentApiDTO {
  return {
    id: segment.id,
    name: segment.name,
    productId: segment.productId,
    productSKU: segment.productSKU || '',
    productName: segment.productName || '',
    bomOwnerType: segment.bomOwnerType || '',
    bomOwnerCustomerId: segment.bomOwnerCustomerId || '',
    bomOwnerCustomerName: segment.bomOwnerCustomerName || '',
    bomVersionLevel: segment.bomVersionLevel || '',
    description: segment.description || '',
    sortOrder: segment.sortOrder || 0,
    attributes: segment.attributes || null,
    processes: (segment.processes || []).map(toProcessApiDTO),
    branchOperations: (segment.branchOperations || []).map(
      toProductionBOMBranchOperationApiDTO
    ),
    updatedAt: segment.updatedAt || '',
  }
}

export function toProductionBOMBranchOperationApiDTO(
  operation: ProductionBOMBranchOperation
): ProductionBOMBranchOperationApiDTO {
  return {
    id: operation.id,
    createdAt: operation.createdAt || '',
    updatedAt: operation.updatedAt || '',
    productId: operation.productId,
    bomOwnerType: operation.bomOwnerType,
    bomOwnerCustomerId: operation.bomOwnerCustomerId,
    bomVersionLevel: operation.bomVersionLevel,
    name: operation.name.trim(),
    description: operation.description.trim(),
    sortOrder: operation.sortOrder,
    isActive: operation.isActive,
    processLibraryId: operation.processLibraryId || undefined,
  }
}

export function toSaveProductionLineApiDTO(
  line: ProductionLine,
  authCode?: string
): SaveProductionLineApiDTO {
  return {
    id: line.id,
    code: normalizeProductionLineCode(line.code),
    name: line.name,
    productTemplateId: line.productTemplateId || '',
    description: line.description || '',
    version: line.version || 1,
    isActive: line.isActive,
    createdAt: line.createdAt || '',
    updatedAt: line.updatedAt || '',
    segments: (line.segments || []).map(toSegmentApiDTO),
    authCode,
  }
}

export function toSaveProductionProcessStepApiDTO(
  step: ProductionProcessStep
): SaveProductionProcessStepApiDTO {
  return {
    id: step.id,
    code: normalizeProductionProcessStepCode(step.code),
    name: step.name,
    description: step.description || '',
    sortOrder: step.sortOrder || 0,
    isActive: step.isActive ?? true,
    createdAt: step.createdAt || '',
    updatedAt: step.updatedAt || '',
  }
}

export function toSaveProductionBOMBranchOperationApiDTO(
  operation: ProductionBOMBranchOperation
): SaveProductionBOMBranchOperationApiDTO {
  return toProductionBOMBranchOperationApiDTO(operation)
}

function toProductionRouteStepApiDTO(
  step: ProductionRouteStep
): ProductionRouteStepApiDTO {
  return {
    id: step.id,
    routeId: step.routeId || '',
    sequence: step.sequence || 1,
    branchOperationId: step.branchOperationId || '',
    processLibraryId: step.processLibraryId || '',
    branchOperationName: step.branchOperationName || '',
    executionMode: step.executionMode || 'IN_HOUSE',
    qualityGate: step.qualityGate || 'NONE',
    qualityRouting: step.qualityRouting || null,
    estimatedMinutes: step.estimatedMinutes || 0,
    transferRequired: step.transferRequired,
    description: step.description || '',
    createdAt: step.createdAt || '',
    updatedAt: step.updatedAt || '',
  }
}

export function toSaveProductionRouteApiDTO(
  route: ProductionRoute
): SaveProductionRouteApiDTO {
  return {
    id: route.id,
    routeFamilyId: route.routeFamilyId || '',
    revisionNo: route.revisionNo || 1,
    basedOnRouteId: route.basedOnRouteId || '',
    isCurrentRevision: route.isCurrentRevision,
    code: route.code.trim(),
    name: route.name.trim(),
    productId: route.productId || '',
    productSKU: route.productSKU || '',
    productName: route.productName.trim(),
    bomOwnerType: route.bomOwnerType || '',
    bomOwnerCustomerId: route.bomOwnerCustomerId || '',
    bomOwnerCustomerName: route.bomOwnerCustomerName || '',
    bomVersionLevel: route.bomVersionLevel || '',
    scopeType: route.scopeType || 'BRANCH_DEFAULT',
    salesOrderLineId: route.salesOrderLineId,
    description: route.description.trim(),
    version: route.version || 1,
    status: route.status || 'DRAFT',
    steps: route.steps.map(toProductionRouteStepApiDTO),
    createdAt: route.createdAt || '',
    updatedAt: route.updatedAt || '',
  }
}
