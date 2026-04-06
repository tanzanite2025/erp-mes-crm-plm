import { purchaseLogisticsDialogAdapter } from '../adapters/logistics-inbound/purchase-logistics-dialog-adapter'
import type {
  LogisticsInboundHostScanResult,
  LogisticsInboundHostScanSession,
} from '../contracts/logistics-inbound-host-contract'
import { logisticsInboundResolutionService } from '../services/logistics-inbound-resolution-service'

export async function runLogisticsInboundHostScan(
  rawCode: string,
  session: LogisticsInboundHostScanSession
): Promise<LogisticsInboundHostScanResult> {
  const hostContext = purchaseLogisticsDialogAdapter.toHostContext(
    session.form,
    session.adapterOptions
  )

  const resolved = await logisticsInboundResolutionService.resolve({
    rawCode,
    source: 'camera',
    surface: 'embedded-dialog',
    context: hostContext,
  })

  const nextForm = purchaseLogisticsDialogAdapter.applyScanPayload(session.form, resolved.payload)
  const submitDraft = purchaseLogisticsDialogAdapter.toSubmissionDraft(nextForm, resolved.payload)

  return {
    nextForm,
    payload: resolved.payload,
    submitDraft,
    warnings: resolved.payload.warnings,
  }
}
