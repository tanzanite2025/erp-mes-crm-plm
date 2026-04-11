import type { InventoryShipmentRecordApiDTO } from '../contracts/shipment-api-dto'
import type { ShipmentRecord } from '../data/schema'

function toDateOnlyString(value?: string): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function toShipmentRecordContract(dto: InventoryShipmentRecordApiDTO): ShipmentRecord {
  return {
    id: dto.id,
    materialId: dto.materialId,
    materialName: dto.materialName,
    materialCode: dto.materialCode,
    salesOrderId: dto.salesOrderId,
    salesOrderLineId: dto.salesOrderLineId,
    quantity: dto.quantity,
    cogs: dto.cogs,
    batchNo: dto.batchNo,
    shipmentDate: toDateOnlyString(dto.shipmentDate),
    operator: dto.operator,
    orderNo: dto.orderNo,
    remarks: dto.remarks,
    sourceCategory: dto.sourceCategory,
    status: dto.status,
    version: dto.version,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function toShipmentRecordContracts(dtos: InventoryShipmentRecordApiDTO[]): ShipmentRecord[] {
  return dtos.map(toShipmentRecordContract)
}

export function toShipmentRecordApiDTO(
  contract: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'>
): Omit<InventoryShipmentRecordApiDTO, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    materialId: contract.materialId,
    materialName: contract.materialName,
    materialCode: contract.materialCode,
    salesOrderId: contract.salesOrderId,
    salesOrderLineId: contract.salesOrderLineId,
    quantity: contract.quantity,
    sourceCategory: contract.sourceCategory,
    batchNo: contract.batchNo,
    orderNo: contract.orderNo,
    status: contract.status,
    cogs: contract.cogs,
    shipmentDate: contract.shipmentDate,
    operator: contract.operator,
    remarks: contract.remarks,
    version: contract.version,
  }
}
