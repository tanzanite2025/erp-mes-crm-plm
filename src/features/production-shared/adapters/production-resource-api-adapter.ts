import type { ProductionLine, ProductionJobCategory, ProductionSegment } from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'
import type {
  ProductionJobCategoryApiDTO,
  ProductionLineApiDTO,
  ProductionLineSegmentApiDTO,
  ProductionLinesResponseApiDTO,
  ProductionProcessStepApiDTO,
  ProductionProcessStepsResponseApiDTO,
  SaveProductionLineApiDTO,
  SaveProductionProcessStepApiDTO,
} from '../contracts/production-resource-api-dto'
import {
  normalizeProductionLineCode,
  normalizeProductionProcessStepCode,
} from '../utils/production-code-normalization'

function toLineProcessContract(dto: ProductionProcessStepApiDTO): ProductionProcessStep {
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

export function toProductionProcessContract(dto: ProductionProcessStepApiDTO): ProductionProcessStep {
  return toLineProcessContract(dto)
}

function toJobCategoryContract(dto: ProductionJobCategoryApiDTO): ProductionJobCategory {
  return {
    id: dto.id,
    segmentId: dto.segmentId || '',
    name: dto.name,
    hierarchyOptionId: dto.hierarchyOptionId || undefined,
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    attributes: dto.attributes || undefined,
    processes: (dto.processes || []).map(toLineProcessContract),
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
}

function toSegmentContract(dto: ProductionLineSegmentApiDTO): ProductionSegment {
  return {
    id: dto.id,
    name: dto.name,
    hierarchyOptionId: dto.hierarchyOptionId || undefined,
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    attributes: dto.attributes || undefined,
    jobCategories: (dto.jobCategories || []).map(toJobCategoryContract),
    updatedAt: dto.updatedAt || '',
  }
}

export function toProductionLineContract(dto: ProductionLineApiDTO): ProductionLine {
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

export function toProductionLineContracts(dto: ProductionLinesResponseApiDTO): ProductionLine[] {
  return (dto.items || []).map(toProductionLineContract)
}

export function toProductionProcessContracts(
  dto: ProductionProcessStepsResponseApiDTO
): ProductionProcessStep[] {
  return (dto.items || []).map(toProductionProcessContract)
}

function toProcessApiDTO(process: ProductionProcessStep): ProductionProcessStepApiDTO {
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

function toJobCategoryApiDTO(category: ProductionJobCategory): ProductionJobCategoryApiDTO {
  return {
    id: category.id,
    segmentId: category.segmentId || '',
    name: category.name,
    hierarchyOptionId: category.hierarchyOptionId || '',
    description: category.description || '',
    sortOrder: category.sortOrder || 0,
    attributes: category.attributes || null,
    processes: (category.processes || []).map(toProcessApiDTO),
    createdAt: category.createdAt || '',
    updatedAt: category.updatedAt || '',
  }
}

function toSegmentApiDTO(segment: ProductionSegment): ProductionLineSegmentApiDTO {
  return {
    id: segment.id,
    name: segment.name,
    hierarchyOptionId: segment.hierarchyOptionId || '',
    description: segment.description || '',
    sortOrder: segment.sortOrder || 0,
    attributes: segment.attributes || null,
    jobCategories: (segment.jobCategories || []).map(toJobCategoryApiDTO),
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
