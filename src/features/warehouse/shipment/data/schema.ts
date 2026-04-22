import type { MasterDataSearchResult } from '../../inventory'
import type { WarehouseCategoryOption } from '../../category/data/schema'

export type ShipmentStatus = 'DRAFT' | 'COMMITTED' | 'VOID'

export interface ShipmentRecord {
  id: string
  materialId: string
  materialName: string
  materialCode: string
  salesOrderId?: string
  salesOrderLineId?: number
  quantity: number
  cogs: number
  batchNo: string
  shipmentDate: string
  operator: string
  orderNo: string
  remarks: string
  sourceCategory: string
  status: ShipmentStatus
  version: number
  createdAt?: string
  updatedAt?: string
}

export interface ShipmentDemandStockBreakdown {
  categoryCode: string
  batchNo: string
  quantity: number
}

export interface ShipmentDemand {
  salesOrderId: string
  salesOrderLineId: number
  orderNo: string
  customerName: string
  deliveryDate: string
  materialId: string
  materialName: string
  materialCode: string
  materialSpec: string
  uom: string
  orderedQty: number
  deliveredQty: number
  virtualReadyQty: number
  remainingToPrepare: number
  availableQty: number
  stockBreakdown: ShipmentDemandStockBreakdown[]
}

export type ShipmentFormMode = 'dispatch' | 'virtualLock'

export const DEFAULT_SHIPMENT_FORM_DATA = {
  quantity: 1,
  batchNo: '',
  orderNo: '',
  salesOrderId: '',
  salesOrderLineId: 0,
  sourceCategory: '',
  shipmentDate: new Date().toISOString().slice(0, 10),
  remarks: '',
}

export type ShipmentFormData = typeof DEFAULT_SHIPMENT_FORM_DATA
export type ShipmentFormUpdater =
  | Partial<ShipmentFormData>
  | ((current: ShipmentFormData) => Partial<ShipmentFormData>)

export interface ShipmentBootstrapState {
  history: ShipmentRecord[]
  shipmentDemands: ShipmentDemand[]
  warehouseCategories: WarehouseCategoryOption[]
  alertThresholds: Record<string, number>
  masterDataMap: Record<string, MasterDataSearchResult>
  error: unknown
}

export const createShipmentFormDraft = (item: MasterDataSearchResult): ShipmentFormData => ({
  ...DEFAULT_SHIPMENT_FORM_DATA,
  sourceCategory: item.category || (item.sourceModule === 'PRODUCT' ? 'FINISHED' : 'MATERIAL'),
  batchNo: `S${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
})
