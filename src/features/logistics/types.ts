import type { TranslationKey } from '@/locales'
import { type BaseEntity } from '@/types/base'

export type LogisticsStatus = 'Pending' | 'InTransit' | 'Delivered' | 'Exception' | 'Canceled'

export type LogisticsType = 'Shipment' | 'Receipt'

export interface LogisticsEvent {
  id: string
  time: string
  location: string
  description: string
  status: LogisticsStatus
}

export interface LogisticsRecord extends BaseEntity {
  orderNo: string
  shipmentId?: string
  salesOrderId?: string
  productId?: string
  type: LogisticsType
  carrier: string
  trackingNo: string
  status: LogisticsStatus
  estimatedArrival?: string
  lastLocation?: string
  contactPerson?: string
  contactPhone?: string
  events: LogisticsEvent[]
  version: number
  isDeleted: boolean
}

export const logisticsStatuses: Array<{
  value: LogisticsStatus
  labelKey: TranslationKey
  color: string
}> = [
  { value: 'Pending', labelKey: 'trading.logistics.statuses.pending', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  { value: 'InTransit', labelKey: 'trading.logistics.statuses.inTransit', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { value: 'Delivered', labelKey: 'trading.logistics.statuses.delivered', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { value: 'Exception', labelKey: 'trading.logistics.statuses.exception', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { value: 'Canceled', labelKey: 'trading.logistics.statuses.canceled', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
]

export const commonCarriers = [
  '顺丰速运',
  '跨越速运',
  '德邦快递',
  '中通快递',
  '圆通速递',
  '自有物流',
  '客户自提',
  '其他',
] as const

const carrierTranslationKeyMap: Record<string, TranslationKey> = {
  顺丰速运: 'trading.logistics.carriers.sf',
  跨越速运: 'trading.logistics.carriers.ky',
  德邦快递: 'trading.logistics.carriers.db',
  中通快递: 'trading.logistics.carriers.zto',
  圆通速递: 'trading.logistics.carriers.yto',
  自有物流: 'trading.logistics.carriers.selfOwned',
  客户自提: 'trading.logistics.carriers.customerPickup',
  其他: 'trading.logistics.carriers.other',
}

export function getCarrierLabelKey(carrier: string | undefined): TranslationKey | null {
  if (!carrier) return null
  return carrierTranslationKeyMap[carrier] ?? null
}
