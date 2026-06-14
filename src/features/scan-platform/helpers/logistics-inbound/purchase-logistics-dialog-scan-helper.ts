import {
  purchaseLogisticsDialogAdapter,
  type PurchaseLogisticsDialogAdapterOptions,
  type PurchaseLogisticsDialogFormValue,
} from '../../adapters/logistics-inbound/purchase-logistics-dialog-adapter'
import type {
  LogisticsInboundHostScanResult,
  LogisticsInboundHostScanSession,
} from '../../contracts/logistics-inbound-host-contract'
import type { LogisticsInboundScanPayload } from '../../models/logistics-inbound'
import { runLogisticsInboundHostScan } from '../../use-cases/logistics-inbound-host-scan'

export interface PurchaseLogisticsDialogScanHelperOptions {
  getForm: () => PurchaseLogisticsDialogFormValue
  setForm: (
    next:
      | PurchaseLogisticsDialogFormValue
      | ((
          current: PurchaseLogisticsDialogFormValue
        ) => PurchaseLogisticsDialogFormValue)
  ) => void
  getAdapterOptions?: () => PurchaseLogisticsDialogAdapterOptions | undefined
  onSummaryChange?: (summary: string) => void
  onWarningsChange?: (warnings: string[]) => void
  onResolved?: (result: LogisticsInboundHostScanResult) => void
}

export interface PurchaseLogisticsDialogScanHelper {
  handleScannedValue: (
    rawCode: string
  ) => Promise<LogisticsInboundHostScanResult>
  buildSubmitDraft: () => {
    purchaseOrderId: string
    orderNo: string
    carrier: string
    trackingNo: string
  }
  getLastPayload: () => LogisticsInboundScanPayload | undefined
  reset: () => void
}

export function createPurchaseLogisticsDialogScanHelper(
  options: PurchaseLogisticsDialogScanHelperOptions
): PurchaseLogisticsDialogScanHelper {
  let lastPayload: LogisticsInboundScanPayload | undefined

  const buildSession = (): LogisticsInboundHostScanSession => ({
    form: options.getForm(),
    adapterOptions: options.getAdapterOptions?.(),
    lastScan: lastPayload,
  })

  return {
    async handleScannedValue(rawCode) {
      const result = await runLogisticsInboundHostScan(rawCode, buildSession())
      lastPayload = result.payload

      options.setForm(result.nextForm)
      options.onSummaryChange?.(result.payload.summary)
      options.onWarningsChange?.(result.warnings)
      options.onResolved?.(result)

      return result
    },

    buildSubmitDraft() {
      return purchaseLogisticsDialogAdapter.toSubmissionDraft(
        options.getForm(),
        lastPayload
      )
    },

    getLastPayload() {
      return lastPayload
    },

    reset() {
      lastPayload = undefined
      options.onSummaryChange?.('')
      options.onWarningsChange?.([])
    },
  }
}
