import type {
  WarehouseCategoryApiDTO,
  WarehouseCategoryListPageApiDTO,
  WarehouseCategoryOptionApiDTO,
} from '../contracts/warehouse-category-api-dto'
import type { WarehouseCategory, WarehouseCategoryOption } from '../data/schema'

export function toWarehouseCategoryContract(dto: WarehouseCategoryApiDTO): WarehouseCategory {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version,
    name: dto.name,
    code: dto.code,
    description: dto.description,
    isSystem: dto.isSystem,
    active: dto.active,
    sortOrder: dto.sortOrder,
    allowInbound: dto.allowInbound,
    allowShipment: dto.allowShipment,
    allowStocktake: dto.allowStocktake,
    allowPurchaseReceipt: dto.allowPurchaseReceipt,
    defaultForProductInbound: dto.defaultForProductInbound,
    defaultForMaterialInbound: dto.defaultForMaterialInbound,
    defaultForPurchaseReceipt: dto.defaultForPurchaseReceipt,
  }
}

export function toWarehouseCategoryContracts(dtos: WarehouseCategoryApiDTO[]): WarehouseCategory[] {
  return dtos.map(toWarehouseCategoryContract)
}

export function toWarehouseCategoryApiDTO(
  contract: Omit<WarehouseCategory, 'id' | 'version' | 'createdAt' | 'updatedAt'>
): Omit<WarehouseCategoryApiDTO, 'id' | 'version' | 'createdAt' | 'updatedAt'> {
  return {
    name: contract.name,
    code: contract.code,
    description: contract.description,
    isSystem: contract.isSystem,
    active: contract.active,
    sortOrder: contract.sortOrder,
    allowInbound: contract.allowInbound,
    allowShipment: contract.allowShipment,
    allowStocktake: contract.allowStocktake,
    allowPurchaseReceipt: contract.allowPurchaseReceipt,
    defaultForProductInbound: contract.defaultForProductInbound,
    defaultForMaterialInbound: contract.defaultForMaterialInbound,
    defaultForPurchaseReceipt: contract.defaultForPurchaseReceipt,
  }
}

export function toWarehouseCategoryOptionContract(dto: WarehouseCategoryOptionApiDTO): WarehouseCategoryOption {
  return {
    value: dto.value,
    label: dto.label,
    code: dto.code,
    name: dto.name,
    active: dto.active,
    sortOrder: dto.sortOrder,
    allowInbound: dto.allowInbound,
    allowShipment: dto.allowShipment,
    allowStocktake: dto.allowStocktake,
    allowPurchaseReceipt: dto.allowPurchaseReceipt,
    defaultForProductInbound: dto.defaultForProductInbound,
    defaultForMaterialInbound: dto.defaultForMaterialInbound,
    defaultForPurchaseReceipt: dto.defaultForPurchaseReceipt,
  }
}

export function toWarehouseCategoryOptionContracts(dtos: WarehouseCategoryOptionApiDTO[]): WarehouseCategoryOption[] {
  return dtos.map(toWarehouseCategoryOptionContract)
}

export function toWarehouseCategoryListPageContract(dto: WarehouseCategoryListPageApiDTO): WarehouseCategory[] {
  return toWarehouseCategoryContracts(dto.items ?? [])
}
