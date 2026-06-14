import type { ScanHostAdapter } from '../../core/host-adapter-contract'
import type {
  LogisticsInboundDraftPatch,
  LogisticsInboundHostContext,
  LogisticsInboundScanPayload,
} from '../../models/logistics-inbound'

export interface PurchaseLogisticsDialogFormValue {
  purchaseOrderId: string
  orderNo: string
  carrier: string
  trackingNo: string
}

export interface PurchaseLogisticsDialogOrderRef {
  id: string
  orderNo: string
  supplierName?: string
}

export interface PurchaseLogisticsDialogAdapterOptions {
  selectedOrder?: PurchaseLogisticsDialogOrderRef | null
  operatorId?: string
  operatorName?: string
}

function normalizeDialogPatch(
  draftPatch: LogisticsInboundDraftPatch
): Partial<PurchaseLogisticsDialogFormValue> {
  return {
    purchaseOrderId: draftPatch.purchaseOrderId || '',
    orderNo: draftPatch.orderNo || '',
    carrier: draftPatch.carrier || '',
    trackingNo: draftPatch.trackingNo,
  }
}

export const purchaseLogisticsDialogAdapter: ScanHostAdapter<
  PurchaseLogisticsDialogFormValue,
  LogisticsInboundScanPayload,
  LogisticsInboundHostContext,
  {
    purchaseOrderId: string
    orderNo: string
    carrier: string
    trackingNo: string
  },
  PurchaseLogisticsDialogAdapterOptions
> = {
  toHostContext(
    form: PurchaseLogisticsDialogFormValue,
    options: PurchaseLogisticsDialogAdapterOptions = {}
  ): LogisticsInboundHostContext {
    return {
      purchaseOrderId: form.purchaseOrderId || undefined,
      orderNo: form.orderNo || options.selectedOrder?.orderNo || undefined,
      supplierName: options.selectedOrder?.supplierName,
      carrier: form.carrier || undefined,
      operatorId: options.operatorId,
      operatorName: options.operatorName,
    }
  },

  applyScanPayload(
    form: PurchaseLogisticsDialogFormValue,
    payload: LogisticsInboundScanPayload
  ): PurchaseLogisticsDialogFormValue {
    const patch = normalizeDialogPatch(payload.draftPatch)

    return {
      purchaseOrderId: patch.purchaseOrderId || form.purchaseOrderId,
      orderNo: patch.orderNo || form.orderNo,
      carrier: patch.carrier || form.carrier,
      trackingNo: patch.trackingNo || form.trackingNo,
    }
  },

  toSubmissionDraft(
    form: PurchaseLogisticsDialogFormValue,
    payload?: LogisticsInboundScanPayload
  ) {
    const draftPatch = payload?.draftPatch

    return {
      purchaseOrderId: draftPatch?.purchaseOrderId || form.purchaseOrderId,
      orderNo: draftPatch?.orderNo || form.orderNo,
      carrier: draftPatch?.carrier || form.carrier,
      trackingNo: draftPatch?.trackingNo || form.trackingNo,
    }
  },
}
