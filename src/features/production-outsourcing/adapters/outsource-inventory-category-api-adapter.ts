import type { OutsourceInventoryCategoryOptionApiDTO } from '../contracts/outsource-inventory-category-api-dto'
import type { OutsourceInventoryCategoryOption } from '../data/outsource-inventory-category'

export function toOutsourceInventoryCategoryOptionContract(
  dto: OutsourceInventoryCategoryOptionApiDTO
): OutsourceInventoryCategoryOption {
  return {
    value: String(dto.value ?? dto.code ?? ''),
    label: String(dto.label ?? dto.name ?? dto.code ?? ''),
    code: String(dto.code ?? ''),
    name: String(dto.name ?? dto.label ?? ''),
    active: Boolean(dto.active),
    sortOrder: Number(dto.sortOrder ?? 0),
    allowInbound: Boolean(dto.allowInbound),
    allowShipment: Boolean(dto.allowShipment),
    allowStocktake: Boolean(dto.allowStocktake),
    allowPurchaseReceipt: Boolean(dto.allowPurchaseReceipt),
    defaultForProductInbound: Boolean(dto.defaultForProductInbound),
    defaultForMaterialInbound: Boolean(dto.defaultForMaterialInbound),
    defaultForPurchaseReceipt: Boolean(dto.defaultForPurchaseReceipt),
  }
}

export function toOutsourceInventoryCategoryOptionContracts(
  dtos: OutsourceInventoryCategoryOptionApiDTO[]
): OutsourceInventoryCategoryOption[] {
  return dtos.map(toOutsourceInventoryCategoryOptionContract)
}
