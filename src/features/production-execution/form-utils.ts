import type { TranslationKey } from '@/locales'
import type {
  ProductionRoute,
  ProductionRouteStep,
} from '@/features/production-shared/data/production-route'
import type { ProductionScanCommandAction } from '@/features/scan-platform/contracts/production-scan-command-api-dto'
import type { ScanCaptureSource } from '@/features/scan-platform/core/types'
import type { ExecuteProductionScanCommandInput } from '@/features/scan-platform/services/production-scan-command-service'

export type ProductionExecutionCaptureMode = 'manual' | 'camera' | 'usb'

const productionExecutionStatusTranslationKeys: Record<string, TranslationKey> =
  {
    NOT_STARTED: 'productionExecution.statuses.NOT_STARTED',
    IN_PROGRESS: 'productionExecution.statuses.IN_PROGRESS',
    COMPLETED: 'productionExecution.statuses.COMPLETED',
    HOLD: 'productionExecution.statuses.HOLD',
    REWORK: 'productionExecution.statuses.REWORK',
  }

export function resolveProductionExecutionStatusTranslationKey(status: string) {
  return (
    productionExecutionStatusTranslationKeys[status] ??
    'productionExecution.workflow.unknownStatus'
  )
}

export function formatProductionExecutionRouteStepName(
  step?: ProductionRouteStep
) {
  return step
    ? `${step.sequence}. ${step.branchOperationName || step.branchOperationId}`
    : ''
}

export function resolveProductionExecutionLifecycleProcessName(
  routes: ProductionRoute[],
  routeId: string,
  routeStepId: string,
  branchOperationId: string
) {
  const steps = routes.find((route) => route.id === routeId)?.steps ?? []
  const step = routeStepId
    ? steps.find((item) => item.id === routeStepId)
    : steps.find((item) => item.branchOperationId === branchOperationId)
  return step ? formatProductionExecutionRouteStepName(step) : branchOperationId
}

export interface ProductionExecutionFormValues {
  productBarcode: string
  captureMode: ProductionExecutionCaptureMode
  action: ProductionScanCommandAction
  productionWorkLocationId: string
  targetRouteStepId: string
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
    productionWorkLocationId: values.productionWorkLocationId,
    targetRouteStepId:
      values.action === 'REWORK' ? values.targetRouteStepId : '',
    result: values.result,
    notes: values.notes,
    fromHolderType: values.fromHolderType,
    fromHolderId: values.fromHolderId,
    toHolderType: values.toHolderType,
    toHolderId: values.toHolderId,
  }
}
