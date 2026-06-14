import { type QueryClient } from '@tanstack/react-query'
import type { TranslationKey } from '@/locales'
import { toast } from 'sonner'
import { type BatchPrintResultItem } from '@/features/code-center/utils/linear-barcode-print-result-builder'
import { PRINT_BATCHES_QUERY_KEY } from '@/features/print-mgmt/query-keys'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export type LinearBarcodeInlineFeedbackKind = 'issueNumbersFailed'
export type LinearBarcodeInlineFeedbackTone =
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
export type LinearBarcodeInlineFeedbackVariant = 'soft' | 'outline'

export interface LinearBarcodeInlineFeedbackState {
  kind: LinearBarcodeInlineFeedbackKind
  message: string
  tone: LinearBarcodeInlineFeedbackTone
  variant: LinearBarcodeInlineFeedbackVariant
}

export function getLinearBarcodeInlineFeedbackClassName(
  feedback: LinearBarcodeInlineFeedbackState
) {
  if (feedback.tone === 'error') {
    return feedback.variant === 'outline'
      ? 'rounded-lg border border-rose-300/60 bg-background px-3 py-2 text-[10px] text-rose-700'
      : 'rounded-lg border border-dashed border-rose-300/40 bg-rose-50/40 px-3 py-2 text-[10px] text-rose-700'
  }

  if (feedback.tone === 'warning') {
    return feedback.variant === 'outline'
      ? 'rounded-lg border border-amber-300/60 bg-background px-3 py-2 text-[10px] text-amber-700'
      : 'rounded-lg border border-dashed border-amber-300/40 bg-amber-50/40 px-3 py-2 text-[10px] text-amber-700'
  }

  if (feedback.tone === 'success') {
    return feedback.variant === 'outline'
      ? 'rounded-lg border border-emerald-300/60 bg-background px-3 py-2 text-[10px] text-emerald-700'
      : 'rounded-lg border border-dashed border-emerald-300/40 bg-emerald-50/40 px-3 py-2 text-[10px] text-emerald-700'
  }

  return feedback.variant === 'outline'
    ? 'rounded-lg border border-sky-300/60 bg-background px-3 py-2 text-[10px] text-sky-700'
    : 'rounded-lg border border-dashed border-sky-300/40 bg-sky-50/40 px-3 py-2 text-[10px] text-sky-700'
}

export interface SinglePrintSuccessFeedbackParams {
  queryClient: QueryClient
  quantity: number
  serialNumber: string
  t: TranslateFn
}

export interface SinglePrintFailureFeedbackParams {
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
  hasSuccess: boolean
}

export interface IssueNumbersFailureFeedbackParams {
  t: TranslateFn
}

async function invalidatePrintBatches(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: PRINT_BATCHES_QUERY_KEY })
}

export async function handleSinglePrintSuccessFeedback({
  queryClient,
  quantity,
  serialNumber,
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
          serialNumber,
        }
      ),
    }
  )
}

export function handleSinglePrintFailureFeedback({
  error,
  t,
}: SinglePrintFailureFeedbackParams) {
  toast.error(
    error instanceof Error && error.message
      ? error.message
      : t(
          'codeCenter.linearBarcode.print.sections.preview.toasts.linePrintFailed'
        )
  )
}

export async function handleBatchPrintCompletionFeedback({
  queryClient,
  successCount,
  failureCount,
  t,
}: BatchPrintCompletionFeedbackParams) {
  if (successCount > 0) {
    await invalidatePrintBatches(queryClient)
  }

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
  hasSuccess,
}: PrintBatchesInvalidateFeedbackParams) {
  if (!hasSuccess) {
    return
  }

  await invalidatePrintBatches(queryClient)
}

export function resolveIssueNumbersFailureFeedback({
  t,
}: IssueNumbersFailureFeedbackParams): LinearBarcodeInlineFeedbackState {
  return {
    kind: 'issueNumbersFailed',
    message: t(
      'codeCenter.linearBarcode.print.sections.preview.states.numberingFailed'
    ),
    tone: 'error',
    variant: 'soft',
  }
}

export function hasSuccessfulPrintResultItem(resultItem: BatchPrintResultItem) {
  return resultItem.status === 'success'
}

export function hasSuccessfulPrintResultItems(items: BatchPrintResultItem[]) {
  return items.some((item) => item.status === 'success')
}
