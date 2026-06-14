import { ensureArrayField } from '@/lib/api-response'
import type {
  InventoryShipmentRecordApiDTO,
  ShipmentDemandApiDTO,
  ShipmentDemandStockBreakdownApiDTO,
} from '../contracts/shipment-api-dto'
import type { ShipmentDemand, ShipmentRecord } from '../data/schema'

export type ShipmentRecordCreateInput = Omit<
  ShipmentRecord,
  'id' | 'createdAt' | 'updatedAt' | 'version'
>

function toDateOnlyString(value?: string): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function toShipmentRecordContract(
  dto: InventoryShipmentRecordApiDTO
): ShipmentRecord {
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

export function toShipmentRecordContracts(
  dtos: InventoryShipmentRecordApiDTO[]
): ShipmentRecord[] {
  return dtos.map(toShipmentRecordContract)
}

export function toShipmentDemandContract(
  dto: ShipmentDemandApiDTO
): ShipmentDemand {
  return {
    salesOrderId: dto.salesOrderId,
    salesOrderLineId: dto.salesOrderLineId,
    orderNo: dto.orderNo,
    customerName: dto.customerName,
    deliveryDate: dto.deliveryDate,
    materialId: dto.materialId,
    materialName: dto.materialName,
    materialCode: dto.materialCode,
    materialSpec: dto.materialSpec,
    uom: dto.uom,
    orderedQty: dto.orderedQty,
    deliveredQty: dto.deliveredQty,
    virtualReadyQty: dto.virtualReadyQty,
    remainingToPrepare: dto.remainingToPrepare,
    availableQty: dto.availableQty,
    stockBreakdown: ensureArrayField<ShipmentDemandStockBreakdownApiDTO>(
      dto,
      'stockBreakdown',
      'ShipmentApiAdapter.toShipmentDemandContract'
    ),
  }
}

export function toShipmentDemandContracts(
  dtos: ShipmentDemandApiDTO[]
): ShipmentDemand[] {
  return dtos.map(toShipmentDemandContract)
}

export function toShipmentRecordApiDTO(
  contract: ShipmentRecordCreateInput
): Omit<
  InventoryShipmentRecordApiDTO,
  'id' | 'createdAt' | 'updatedAt' | 'version'
> {
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
  }
}
