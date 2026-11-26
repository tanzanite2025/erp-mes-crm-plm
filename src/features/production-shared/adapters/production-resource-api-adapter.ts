import type {
  ProductionLineApiDTO,
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

export function toProductionProcessContract(
  dto: ProductionProcessStepApiDTO
): ProductionProcessStep {
  return toLineProcessContract(dto)
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
  }
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
    processStepId: dto.processStepId || '',
    processName: dto.processName || '',
    processDescription: dto.processDescription || '',
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
    productTypeName: dto.productTypeName || '',
    bomOwnerType: dto.bomOwnerType,
    bomOwnerCustomerId: dto.bomOwnerCustomerId,
    bomOwnerCustomerName: dto.bomOwnerCustomerName,
    bomVersionLevel: dto.bomVersionLevel,
    processes: (dto.processes || []).map(toLineProcessContract),
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

export function toSaveProductionLineApiDTO(
  line: ProductionLine,
  authCode?: string
): SaveProductionLineApiDTO {
  return {
    id: line.id,
    code: normalizeProductionLineCode(line.code),
    name: line.name,
    description: line.description || '',
    version: line.version || 1,
    isActive: line.isActive,
    createdAt: line.createdAt || '',
    updatedAt: line.updatedAt || '',
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

function toProductionRouteStepApiDTO(
  step: ProductionRouteStep
): ProductionRouteStepApiDTO {
  return {
    id: step.id,
    routeId: step.routeId || '',
    sequence: step.sequence || 1,
    processStepId: step.processStepId || '',
    processName: step.processName || '',
    processDescription: step.processDescription || '',
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
