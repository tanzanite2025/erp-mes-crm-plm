import type {
  FurnaceApiDTO,
  FurnaceListPageApiDTO,
  SaveFurnaceApiDTO,
} from '../contracts/furnace-api-dto'
import type { Furnace } from '../data/furnace-schema'

export interface FurnaceListPage {
  items: Furnace[]
  total: number
  page: number
  pageSize: number
  version: number
}

export function toFurnaceContract(dto: FurnaceApiDTO): Furnace {
  return {
    id: dto.id,
    sn: dto.sn,
    name: dto.name,
    type: dto.type,
    maxTemp: dto.maxTemp,
    currentTemp: dto.currentTemp,
    imageUrl: '',
    version: dto.version,
    status: dto.status,
    location: dto.location || '',
    description: dto.description || '',
    createdAt: dto.createdAt,
    createdBy: dto.createdBy,
    updatedBy: dto.updatedBy,
    updatedAt: dto.updatedAt,
  }
}

export function toFurnaceContracts(dtos: FurnaceApiDTO[]): Furnace[] {
  return dtos.map(toFurnaceContract)
}

export function toFurnaceListPageContract(
  dto: FurnaceListPageApiDTO
): FurnaceListPage {
  return {
    items: toFurnaceContracts(dto.items),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    version: dto.version,
  }
}

export function toSaveFurnaceApiDTO(
  contract: Partial<Furnace>
): SaveFurnaceApiDTO {
  return {
    id: contract.id || undefined,
    sn: contract.sn || '',
    name: contract.name || '',
    type: contract.type || '',
    maxTemp: contract.maxTemp ?? 0,
    currentTemp: contract.currentTemp ?? 25,
    status: contract.status ?? 'IDLE',
    location: contract.location || '',
    description: contract.description || '',
  }
}
