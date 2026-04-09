import { type MasterDataSearchResult } from '../services/inventory-core-service'

export interface WarehouseCategoryOption {
  value: string
  label: string
}

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

export const createShipmentFormDraft = (item: MasterDataSearchResult): ShipmentFormData => ({
  ...DEFAULT_SHIPMENT_FORM_DATA,
  sourceCategory: item.category || (item.sourceModule === 'PRODUCT' ? 'FINISHED' : 'MATERIAL'),
  batchNo: `S${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
})
