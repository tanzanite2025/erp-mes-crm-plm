import { type QueryClient } from '@tanstack/react-query'
import type { TranslationKey } from '@/locales'
import { toast } from 'sonner'
import { type BatchPrintResultItem } from '@/features/code-center/utils/linear-barcode-print-result-builder'
import {
  LINEAR_BARCODE_INVENTORY_QUERY_KEY,
  PRINT_BATCHES_QUERY_KEY,
} from '@/features/print-mgmt/query-keys'
import {
  LinearBarcodePrintPreviewBlockedError,
  LinearBarcodePrintPreviewClosedError,
  LinearBarcodePrintRenderError,
} from '../services/linear-barcode-print-preview'
import { LinearBarcodePrintQuantityError } from '../services/linear-barcode-print-safety'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export interface SinglePrintSuccessFeedbackParams {
  queryClient: QueryClient
  quantity: number
  code: string
  t: TranslateFn
}

export interface SinglePrintFailureFeedbackParams {
  queryClient: QueryClient
  error: unknown
  t: TranslateFn
}

export interface BatchPrintCompletionFeedbackParams {
  queryClient: QueryClient
  successCount: number
  failureCount: number
  t: TranslateFn
}

export interface PrintBatchesInvalidateFeedbackParams {
  queryClient: QueryClient
}

async function invalidatePrintBatches(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: PRINT_BATCHES_QUERY_KEY }),
    queryClient.invalidateQueries({
      queryKey: LINEAR_BARCODE_INVENTORY_QUERY_KEY,
    }),
  ])
}

export async function handleSinglePrintSuccessFeedback({
  queryClient,
  quantity,
  code,
  t,
}: SinglePrintSuccessFeedbackParams) {
  await invalidatePrintBatches(queryClient)
  toast.success(
    t(
      'codeCenter.linearBarcode.print.sections.preview.toasts.linePrintSuccess',
      { quantity }
    ),
    {
      description: t(
        'codeCenter.linearBarcode.print.sections.preview.toasts.linePrintSuccessDescription',
        {
          code,
        }
      ),
    }
  )
}

export async function handleSinglePrintFailureFeedback({
  queryClient,
  error,
  t,
}: SinglePrintFailureFeedbackParams) {
  await invalidatePrintBatches(queryClient)
  toast.error(resolveLinearBarcodePrintErrorMessage(error, t))
}

export function resolveLinearBarcodePrintErrorMessage(
  error: unknown,
  t: TranslateFn
) {
  if (error instanceof LinearBarcodePrintQuantityError) {
    return t(
      'codeCenter.linearBarcode.print.sections.preview.errors.quantityInvalid',
      { quantity: error.quantity }
    )
  }
  if (error instanceof LinearBarcodePrintPreviewBlockedError) {
    return t(
      'codeCenter.linearBarcode.print.sections.preview.errors.previewBlocked'
    )
  }
  if (error instanceof LinearBarcodePrintPreviewClosedError) {
    return t(
      'codeCenter.linearBarcode.print.sections.preview.errors.previewClosed'
    )
  }
  if (error instanceof LinearBarcodePrintRenderError) {
    return t(
      'codeCenter.linearBarcode.print.sections.preview.errors.renderFailed'
    )
  }

  return error instanceof Error && error.message
    ? error.message
    : t(
        'codeCenter.linearBarcode.print.sections.preview.toasts.linePrintFailed'
      )
}

export async function handleBatchPrintCompletionFeedback({
  queryClient,
  successCount,
  failureCount,
  t,
}: BatchPrintCompletionFeedbackParams) {
  await invalidatePrintBatches(queryClient)

  if (successCount > 0 && failureCount === 0) {
    toast.success(
      t(
        'codeCenter.linearBarcode.print.sections.preview.toasts.batchPrintSuccess',
        {
          count: successCount,
        }
      )
    )
    return
  }

  if (successCount > 0) {
    toast.error(
      t(
        'codeCenter.linearBarcode.print.sections.preview.toasts.batchPrintPartial',
        {
          successCount,
          failureCount,
        }
      )
    )
    return
  }

  toast.error(
    t('codeCenter.linearBarcode.print.sections.preview.toasts.batchPrintFailed')
  )
}

export async function handlePrintBatchesInvalidateFeedback({
  queryClient,
}: PrintBatchesInvalidateFeedbackParams) {
  await invalidatePrintBatches(queryClient)
}

export function hasSuccessfulPrintResultItem(resultItem: BatchPrintResultItem) {
  return resultItem.status === 'success'
}
