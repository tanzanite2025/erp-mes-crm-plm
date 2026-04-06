import type {
  PurchaseLogisticsDialogAdapterOptions,
  PurchaseLogisticsDialogFormValue,
} from '../adapters/logistics-inbound/purchase-logistics-dialog-adapter'
import type { LogisticsInboundScanPayload } from '../models/logistics-inbound'

export interface LogisticsInboundHostScanSession {
  form: PurchaseLogisticsDialogFormValue
  adapterOptions?: PurchaseLogisticsDialogAdapterOptions
  lastScan?: LogisticsInboundScanPayload
}

export interface LogisticsInboundHostScanResult {
  nextForm: PurchaseLogisticsDialogFormValue
  payload: LogisticsInboundScanPayload
  submitDraft: {
    purchaseOrderId: string
    orderNo: string
    carrier: string
    trackingNo: string
  }
  warnings: string[]
}
