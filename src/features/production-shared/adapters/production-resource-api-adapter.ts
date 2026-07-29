import type {
  ProductionLineApiDTO,
  ProductionLineSegmentApiDTO,
  ProductionLinesResponseApiDTO,
  ProductionProcessStepApiDTO,
  ProductionProcessStepsResponseApiDTO,
  ProductionRouteApiDTO,
  ProductionRoutesResponseApiDTO,
  ProductionRouteStepApiDTO,
  SaveProductionLineApiDTO,
  SaveProductionProcessStepApiDTO,
  SaveProductionRouteApiDTO,
} from '../contracts/production-resource-api-dto'
import type { ProductionLine, ProductionSegment } from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'
import type {
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

function toSegmentContract(
  dto: ProductionLineSegmentApiDTO
): ProductionSegment {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    attributes: dto.attributes || undefined,
    processes: (dto.processes || []).map(toLineProcessContract),
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

export function toProductionLineContracts(
  dto: ProductionLinesResponseApiDTO
): ProductionLine[] {
  return (dto.items || []).map(toProductionLineContract)
}

function normalizeRouteStatus(value?: string): ProductionRouteStatus {
  if (value === 'PUBLISHED' || value === 'ARCHIVED') {
    return value
  }
  return 'DRAFT'
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
    const targetProcessStepId =
      typeof target.targetProcessStepId === 'string'
        ? target.targetProcessStepId.trim()
        : ''
    if (!targetRouteStepId && !targetProcessStepId) {
      continue
    }
    routing[disposition.toUpperCase()] = {
      targetRouteStepId: targetRouteStepId || undefined,
      targetProcessStepId: targetProcessStepId || undefined,
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
    processCode: dto.processCode || '',
    processName: dto.processName || '',
    segmentId: dto.segmentId || '',
    segmentName: dto.segmentName || '',
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
    code: dto.code || '',
    name: dto.name || '',
    productId: dto.productId || '',
    productName: dto.productName || '',
    productTemplateId: dto.productTemplateId || '',
    description: dto.description || '',
    version: Number(dto.version) || 1,
    status: normalizeRouteStatus(dto.status),
    steps: (dto.steps || []).map(toProductionRouteStepContract),
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
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
  segment: ProductionSegment
): ProductionLineSegmentApiDTO {
  return {
    id: segment.id,
    name: segment.name,
    description: segment.description || '',
    sortOrder: segment.sortOrder || 0,
    attributes: segment.attributes || null,
    processes: (segment.processes || []).map(toProcessApiDTO),
    updatedAt: segment.updatedAt || '',
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

function toProductionRouteStepApiDTO(
  step: ProductionRouteStep
): ProductionRouteStepApiDTO {
  return {
    id: step.id,
    routeId: step.routeId || '',
    sequence: step.sequence || 1,
    processStepId: step.processStepId || '',
    processCode: step.processCode || '',
    processName: step.processName || '',
    segmentId: step.segmentId || '',
    segmentName: step.segmentName || '',
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
    code: route.code.trim(),
    name: route.name.trim(),
    productId: route.productId || '',
    productName: route.productName.trim(),
    productTemplateId: route.productTemplateId || '',
    description: route.description.trim(),
    version: route.version || 1,
    status: route.status || 'DRAFT',
    steps: route.steps.map(toProductionRouteStepApiDTO),
    createdAt: route.createdAt || '',
    updatedAt: route.updatedAt || '',
  }
}
