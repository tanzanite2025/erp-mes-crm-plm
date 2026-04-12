import {
  type CreateInventoryInboundApiDTO,
  type InventoryAlertSummaryApiDTO,
  type InventoryInboundRecordApiDTO,
  type InventoryItemApiDTO,
  type InventoryValuationApiDTO,
  type MasterDataSearchResultApiDTO,
} from '../contracts/inventory-api-dto'
import {
  type InboundTDO,
  type InboundRecord,
  type InventoryAlertSummary,
  type InventoryRecord,
  type InventoryView,
  type MasterDataSearchResult,
} from '../data/schema'

function toDateOnlyString(value?: string): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function toInventoryRecordContract(dto: InventoryItemApiDTO): InventoryRecord {
  return {
    id: dto.id,
    materialId: dto.materialId,
    onHand: dto.onHand,
    reserved: dto.reserved,
    availableQty: dto.availableQty,
    quantity: dto.quantity,
    totalValue: dto.totalValue,
    averageUnitCost: dto.averageUnitCost,
    categoryCode: dto.categoryCode,
    lastUpdated: dto.lastUpdated || dto.updatedAt || dto.createdAt || '',
    version: dto.version,
  }
}

export function toInventoryViewContract(dto: InventoryItemApiDTO): InventoryView {
  return {
    ...toInventoryRecordContract(dto),
    materialName: dto.materialName,
    materialCode: dto.materialCode,
    materialCategory: dto.materialCategory,
    materialSpec: dto.materialSpec,
    batchNo: dto.batchNo,
    uom: dto.uom,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function toInventoryViewContracts(dtos: InventoryItemApiDTO[]): InventoryView[] {
  return dtos.map(toInventoryViewContract)
}

export function toMasterDataSearchResultContract(
  dto: MasterDataSearchResultApiDTO
): MasterDataSearchResult {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    spec: dto.spec,
    uom: dto.uom,
    category: dto.category,
    sourceModule: dto.sourceModule,
    stock: dto.stock,
  }
}

export function toMasterDataSearchResultContracts(
  dtos: MasterDataSearchResultApiDTO[]
): MasterDataSearchResult[] {
  return dtos.map(toMasterDataSearchResultContract)
}

export function toInboundRecordContract(dto: InventoryInboundRecordApiDTO): InboundRecord {
  return {
    id: dto.id,
    materialId: dto.materialId,
    materialName: dto.materialName,
    materialCode: dto.materialCode,
    purchaseOrderId: dto.purchaseOrderId,
    purchaseOrderLineId: dto.purchaseOrderLineId,
    quantity: dto.quantity,
    purchasePrice: dto.purchasePrice,
    batchNo: dto.batchNo,
    entryDate: toDateOnlyString(dto.inboundDate),
    operator: dto.operator,
    remarks: dto.remarks,
    targetCategory: dto.targetCategory,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function toInboundRecordContracts(dtos: InventoryInboundRecordApiDTO[]): InboundRecord[] {
  return dtos.map(toInboundRecordContract)
}

export function toInboundTDOApiDTO(contract: InboundTDO): CreateInventoryInboundApiDTO {
  return {
    materialId: contract.materialId,
    quantity: contract.quantity,
    targetCategory: contract.targetCategory,
    batchNo: contract.batchNo,
    inboundDate: contract.entryDate,
    remarks: contract.remarks,
  }
}

export function toInventoryValuationContract(dto: InventoryValuationApiDTO): number {
  return dto.totalValue
}

export function toInventoryAlertSummaryContract(
  dto: InventoryAlertSummaryApiDTO
): InventoryAlertSummary {
  return { alertCount: dto.alertCount }
}
