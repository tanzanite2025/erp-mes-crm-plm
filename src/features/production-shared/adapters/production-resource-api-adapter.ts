import type { ProcessStep as ArchitectureProcessStep } from '../tabs/work-architecture/components/process-utils'
import type {
  JobCategory,
  ProductionLine,
  Segment,
  ProcessStep as LineProcessStep,
  Station,
} from '../tabs/line-mgmt/types'
import type {
  ProductionJobCategoryApiDTO,
  ProductionLineApiDTO,
  ProductionLineSegmentApiDTO,
  ProductionLinesResponseApiDTO,
  ProductionProcessStepApiDTO,
  ProductionProcessStepsResponseApiDTO,
  ProductionStationApiDTO,
  SaveProductionLineApiDTO,
  SaveProductionProcessStepApiDTO,
  StationMappingsResponseApiDTO,
} from '../contracts/production-resource-api-dto'

function toLineProcessContract(dto: ProductionProcessStepApiDTO): LineProcessStep {
  return {
    id: dto.id,
    code: dto.code || '',
    name: dto.name,
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    isActive: dto.isActive ?? true,
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
}

export function toArchitectureProcessContract(
  dto: ProductionProcessStepApiDTO
): ArchitectureProcessStep {
  return {
    id: dto.id,
    code: dto.code || '',
    name: dto.name,
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    isActive: dto.isActive ?? true,
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
}

function toStationContract(dto: ProductionStationApiDTO): Station {
  return {
    id: dto.id,
    categoryId: dto.categoryId || '',
    code: dto.code || '',
    name: dto.name,
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    attributes: dto.attributes || undefined,
    processes: (dto.processes || []).map(toLineProcessContract),
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
}

function toJobCategoryContract(dto: ProductionJobCategoryApiDTO): JobCategory {
  return {
    id: dto.id,
    segmentId: dto.segmentId || '',
    name: dto.name,
    description: dto.description || '',
    sortOrder: dto.sortOrder || 0,
    attributes: dto.attributes || undefined,
    stations: (dto.stations || []).map(toStationContract),
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
  }
}

function toSegmentContract(dto: ProductionLineSegmentApiDTO): Segment {
  return {
    id: dto.id,
    name: dto.name,
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
    code: dto.code,
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
): ArchitectureProcessStep[] {
  return (dto.items || []).map(toArchitectureProcessContract)
}

export function toStationMappingsContract(dto: StationMappingsResponseApiDTO): Record<string, string[]> {
  return dto.items || {}
}

function toProcessApiDTO(process: LineProcessStep): ProductionProcessStepApiDTO {
  return {
    id: process.id,
    code: process.code || '',
    name: process.name,
    description: process.description || '',
    sortOrder: process.sortOrder || 0,
    isActive: process.isActive ?? true,
    createdAt: process.createdAt || '',
    updatedAt: process.updatedAt || '',
  }
}

function toStationApiDTO(station: Station): ProductionStationApiDTO {
  return {
    id: station.id,
    categoryId: station.categoryId || '',
    code: station.code || '',
    name: station.name,
    description: station.description || '',
    sortOrder: station.sortOrder || 0,
    attributes: station.attributes || null,
    processes: (station.processes || []).map(toProcessApiDTO),
    createdAt: station.createdAt || '',
    updatedAt: station.updatedAt || '',
  }
}

function toJobCategoryApiDTO(category: JobCategory): ProductionJobCategoryApiDTO {
  return {
    id: category.id,
    segmentId: category.segmentId || '',
    name: category.name,
    description: category.description || '',
    sortOrder: category.sortOrder || 0,
    attributes: category.attributes || null,
    stations: (category.stations || []).map(toStationApiDTO),
    createdAt: category.createdAt || '',
    updatedAt: category.updatedAt || '',
  }
}

function toSegmentApiDTO(segment: Segment): ProductionLineSegmentApiDTO {
  return {
    id: segment.id,
    name: segment.name,
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
    code: line.code,
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
  step: ArchitectureProcessStep,
  stationId?: string
): SaveProductionProcessStepApiDTO {
  return {
    id: step.id,
    code: step.code || '',
    name: step.name,
    description: step.description || '',
    sortOrder: step.sortOrder || 0,
    isActive: step.isActive ?? true,
    createdAt: step.createdAt || '',
    updatedAt: step.updatedAt || '',
    stationId,
  }
}
