import type { ProductionRouteStep } from '@/features/production-shared/data/production-route'
import type { ProductionScanCommandAction } from '@/features/scan-platform/contracts/production-scan-command-api-dto'
import type { ScanCaptureSource } from '@/features/scan-platform/core/types'
import type { ExecuteProductionScanCommandInput } from '@/features/scan-platform/services/production-scan-command-service'

export type ProductionExecutionCaptureMode = 'manual' | 'camera' | 'usb'

export function formatProductionExecutionRouteStepName(
  step?: ProductionRouteStep
) {
  return step
    ? `${step.sequence}. ${step.processName || step.processCode || step.processStepId}`
    : ''
}

export interface ProductionExecutionFormValues {
  productBarcode: string
  captureMode: ProductionExecutionCaptureMode
  action: ProductionScanCommandAction
  executionLotId: string
  routeId: string
  routeStepId: string
  processStepId: string
  targetRouteStepId: string
  targetProcessStepId: string
  result: string
  notes: string
  fromHolderType: string
  fromHolderId: string
  toHolderType: string
  toHolderId: string
}

export function resolveProductionExecutionCaptureSource(
  mode: ProductionExecutionCaptureMode
): ScanCaptureSource {
  return mode === 'usb' ? 'hardware' : mode
}

export function buildProductionExecutionCommandInput(
  values: ProductionExecutionFormValues
): ExecuteProductionScanCommandInput {
  return {
    productBarcode: values.productBarcode,
    source: resolveProductionExecutionCaptureSource(values.captureMode),
    action: values.action,
    executionLotId: values.executionLotId,
    routeId: values.routeId,
    routeStepId: values.routeStepId,
    processStepId: values.processStepId,
    targetRouteStepId:
      values.action === 'REWORK' ? values.targetRouteStepId : '',
    targetProcessStepId:
      values.action === 'REWORK' ? values.targetProcessStepId : '',
    result: values.result,
    notes: values.notes,
    fromHolderType: values.fromHolderType,
    fromHolderId: values.fromHolderId,
    toHolderType: values.toHolderType,
    toHolderId: values.toHolderId,
  }
}
