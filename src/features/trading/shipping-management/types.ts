export type ShippingVehicleMatchStatus = '待匹配' | '待联系' | '已锁定'

export interface ShippingVehicleMatchItem {
  id: string
  shipmentId: string
  orderNo: string
  customerName: string
  warehouseName: string
  materialName: string
  materialCode: string
  quantity: number
  boxCount: number | null
  volumeM3: number | null
  weightKg: number | null
  status: ShippingVehicleMatchStatus
  shipmentStatus: string
  logisticsStatus: string
  packageProfileId: string
  packageProfileName: string
}
