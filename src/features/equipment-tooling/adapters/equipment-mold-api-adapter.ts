import type {
  MoldApiDTO,
  MoldDuplicateCheckApiDTO,
  MoldListPageApiDTO,
  SaveMoldApiDTO,
} from '../contracts/equipment-mold-api-dto'
import { moldSchema, type Mold } from '../data/schema'

export interface MoldListPage {
  items: Mold[]
  total: number
  page: number
  pageSize: number
  version: number
}

export function toMoldContract(dto: MoldApiDTO): Mold {
  return moldSchema.parse({
    id: dto.id,
    sn: dto.sn,
    name: dto.name,
    maxCycles: dto.maxCycles,
    currentCycles: dto.currentCycles,
    maintenanceThreshold: dto.maintenanceThreshold,
    totalLifeCycles: dto.totalLifeCycles,
    groupName: dto.groupName,
    status: dto.status,
    location: dto.location,
    description: dto.description,
    isAlerted: dto.isAlerted,
    lastCheckedAt: dto.lastCheckedAt ?? undefined,
    imageUrl: dto.imageUrl,
    version: dto.version,
    createdAt: dto.createdAt,
    createdBy: dto.createdBy,
    updatedBy: dto.updatedBy,
    updatedAt: dto.updatedAt,
  })
}

export function toMoldContracts(dtos: MoldApiDTO[]): Mold[] {
  return dtos.map(toMoldContract)
}

export function toMoldListPageContract(dto: MoldListPageApiDTO): MoldListPage {
  return {
    items: toMoldContracts(dto.items),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    version: dto.version,
  }
}

export function toSaveMoldApiDTO(
  contract: Omit<
    Mold,
    'version' | 'createdAt' | 'createdBy' | 'updatedBy' | 'updatedAt'
  >
): SaveMoldApiDTO {
  return {
    id: contract.id || undefined,
    sn: contract.sn,
    name: contract.name,
    maxCycles: contract.maxCycles,
    currentCycles: contract.currentCycles,
    maintenanceThreshold: contract.maintenanceThreshold,
    totalLifeCycles: contract.totalLifeCycles,
    groupName: contract.groupName || '',
    status: contract.status,
    location: contract.location || '',
    description: contract.description || '',
    isAlerted: contract.isAlerted,
    lastCheckedAt: contract.lastCheckedAt,
    imageUrl: contract.imageUrl || '',
  }
}

export function toMoldDuplicateCheckContract(
  dto: MoldDuplicateCheckApiDTO
): boolean {
  return dto.duplicate
}
