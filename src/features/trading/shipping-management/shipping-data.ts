export type VirtualWarehouseShipment = {
  id: string
  orderNo: string
  customerName: string
  warehouseName: string
  boxCount: number
  volumeM3: number
  weightKg: number
  status: '待匹配' | '待联系' | '已锁定'
}

export const virtualWarehouseShipments: VirtualWarehouseShipment[] = [
  {
    id: 'VW-001',
    orderNo: 'SO-2026-0415-001',
    customerName: '华东科技',
    warehouseName: '虚拟发货仓',
    boxCount: 18,
    volumeM3: 12.4,
    weightKg: 2680,
    status: '待匹配',
  },
  {
    id: 'VW-002',
    orderNo: 'SO-2026-0415-002',
    customerName: '恒远制造',
    warehouseName: '虚拟发货仓',
    boxCount: 10,
    volumeM3: 8.1,
    weightKg: 1640,
    status: '待联系',
  },
  {
    id: 'VW-003',
    orderNo: 'SO-2026-0415-003',
    customerName: '北辰供应链',
    warehouseName: '虚拟发货仓',
    boxCount: 24,
    volumeM3: 17.8,
    weightKg: 3520,
    status: '已锁定',
  },
]
