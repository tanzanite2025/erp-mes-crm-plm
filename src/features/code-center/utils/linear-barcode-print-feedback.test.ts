import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type QueryClient } from '@tanstack/react-query'
import { PRINT_BATCHES_QUERY_KEY } from '@/features/print-mgmt/query-keys'

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

import {
  getLinearBarcodeInlineFeedbackClassName,
  handleBatchPrintCompletionFeedback,
  handlePrintBatchesInvalidateFeedback,
  handleSinglePrintFailureFeedback,
  handleSinglePrintSuccessFeedback,
  hasSuccessfulPrintResultItem,
  hasSuccessfulPrintResultItems,
  resolveIssueNumbersFailureFeedback,
  type LinearBarcodeInlineFeedbackState,
} from './linear-barcode-print-feedback'

function translate(
  key: string,
  params?: Record<string, string | number>
) {
  return params ? `${key}:${JSON.stringify(params)}` : key
}

const tMock = vi.fn(translate)

function createQueryClientMock() {
  return {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  } as unknown as QueryClient
}

function createResultItem(status: 'success' | 'failed' | 'skipped') {
  return {
    key: `line-${status}`,
    lineNo: 1,
    productLabel: 'Demo Product',
    status,
    message: `message-${status}`,
    serial: 'SN-001',
    barcodeSerial: 'BC-001',
  }
}

describe('linear-barcode-print-feedback', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    tMock.mockClear()
  })

  describe('getLinearBarcodeInlineFeedbackClassName', () => {
    it('returns the dashed rose class for error soft feedback', () => {
      const feedback: LinearBarcodeInlineFeedbackState = {
        kind: 'issueNumbersFailed',
        message: 'failed',
        tone: 'error',
        variant: 'soft',
      }

      expect(getLinearBarcodeInlineFeedbackClassName(feedback)).toBe(
        'rounded-lg border border-dashed border-rose-300/40 bg-rose-50/40 px-3 py-2 text-[10px] text-rose-700'
      )
    })

    it('returns the solid rose class for error outline feedback', () => {
      const feedback: LinearBarcodeInlineFeedbackState = {
        kind: 'issueNumbersFailed',
        message: 'failed',
        tone: 'error',
        variant: 'outline',
      }

      expect(getLinearBarcodeInlineFeedbackClassName(feedback)).toBe(
        'rounded-lg border border-rose-300/60 bg-background px-3 py-2 text-[10px] text-rose-700'
      )
    })

    it('returns the warning class for warning soft feedback', () => {
      const feedback: LinearBarcodeInlineFeedbackState = {
        kind: 'issueNumbersFailed',
        message: 'warning',
        tone: 'warning',
        variant: 'soft',
      }

      expect(getLinearBarcodeInlineFeedbackClassName(feedback)).toBe(
        'rounded-lg border border-dashed border-amber-300/40 bg-amber-50/40 px-3 py-2 text-[10px] text-amber-700'
      )
    })

    it('returns the success class for success outline feedback', () => {
      const feedback: LinearBarcodeInlineFeedbackState = {
        kind: 'issueNumbersFailed',
        message: 'success',
        tone: 'success',
        variant: 'outline',
      }

      expect(getLinearBarcodeInlineFeedbackClassName(feedback)).toBe(
        'rounded-lg border border-emerald-300/60 bg-background px-3 py-2 text-[10px] text-emerald-700'
      )
    })

    it('falls back to the info class for info soft feedback', () => {
      const feedback: LinearBarcodeInlineFeedbackState = {
        kind: 'issueNumbersFailed',
        message: 'info',
        tone: 'info',
        variant: 'soft',
      }

      expect(getLinearBarcodeInlineFeedbackClassName(feedback)).toBe(
        'rounded-lg border border-dashed border-sky-300/40 bg-sky-50/40 px-3 py-2 text-[10px] text-sky-700'
      )
    })
  })

  describe('resolveIssueNumbersFailureFeedback', () => {
    it('returns the structured inline feedback state', () => {
      expect(resolveIssueNumbersFailureFeedback({ t: tMock })).toEqual({
        kind: 'issueNumbersFailed',
        message: translate('codeCenter.linearBarcode.print.sections.preview.states.numberingFailed'),
        tone: 'error',
        variant: 'soft',
      })
    })
  })

  describe('handleSinglePrintSuccessFeedback', () => {
    it('invalidates print batches and shows success toast', async () => {
      const queryClient = createQueryClientMock()

      await handleSinglePrintSuccessFeedback({
        queryClient,
        quantity: 3,
        serialNumber: 'SN-1001',
        t: tMock,
      })

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: PRINT_BATCHES_QUERY_KEY,
      })
      expect(toastSuccessMock).toHaveBeenCalledWith(
        translate('codeCenter.linearBarcode.print.sections.preview.toasts.linePrintSuccess', {
          quantity: 3,
        }),
        {
          description: translate(
            'codeCenter.linearBarcode.print.sections.preview.toasts.linePrintSuccessDescription',
            { serialNumber: 'SN-1001' }
          ),
        }
      )
    })
  })

  describe('handleSinglePrintFailureFeedback', () => {
    it('prefers the explicit Error message', () => {
      handleSinglePrintFailureFeedback({
        error: new Error('print failed loudly'),
        t: tMock,
      })

      expect(toastErrorMock).toHaveBeenCalledWith('print failed loudly')
    })

    it('falls back to the localized failure message for non-Error values', () => {
      handleSinglePrintFailureFeedback({
        error: 'unexpected',
        t: tMock,
      })

      expect(toastErrorMock).toHaveBeenCalledWith(
        translate('codeCenter.linearBarcode.print.sections.preview.toasts.linePrintFailed')
      )
    })
  })

  describe('handleBatchPrintCompletionFeedback', () => {
    it('shows success toast and invalidates when all lines succeed', async () => {
      const queryClient = createQueryClientMock()

      await handleBatchPrintCompletionFeedback({
        queryClient,
        successCount: 2,
        failureCount: 0,
        t: tMock,
      })

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: PRINT_BATCHES_QUERY_KEY,
      })
      expect(toastSuccessMock).toHaveBeenCalledWith(
        translate('codeCenter.linearBarcode.print.sections.preview.toasts.batchPrintSuccess', {
          count: 2,
        })
      )
      expect(toastErrorMock).not.toHaveBeenCalled()
    })

    it('shows partial failure toast and invalidates when some lines succeed', async () => {
      const queryClient = createQueryClientMock()

      await handleBatchPrintCompletionFeedback({
        queryClient,
        successCount: 2,
        failureCount: 1,
        t: tMock,
      })

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: PRINT_BATCHES_QUERY_KEY,
      })
      expect(toastErrorMock).toHaveBeenCalledWith(
        translate('codeCenter.linearBarcode.print.sections.preview.toasts.batchPrintPartial', {
          successCount: 2,
          failureCount: 1,
        })
      )
      expect(toastSuccessMock).not.toHaveBeenCalled()
    })

    it('shows failure toast without invalidating when no line succeeds', async () => {
      const queryClient = createQueryClientMock()

      await handleBatchPrintCompletionFeedback({
        queryClient,
        successCount: 0,
        failureCount: 3,
        t: tMock,
      })

      expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
      expect(toastErrorMock).toHaveBeenCalledWith(
        translate('codeCenter.linearBarcode.print.sections.preview.toasts.batchPrintFailed')
      )
      expect(toastSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('handlePrintBatchesInvalidateFeedback', () => {
    it('invalidates batches when success exists', async () => {
      const queryClient = createQueryClientMock()

      await handlePrintBatchesInvalidateFeedback({
        queryClient,
        hasSuccess: true,
      })

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: PRINT_BATCHES_QUERY_KEY,
      })
    })

    it('skips invalidation when no success exists', async () => {
      const queryClient = createQueryClientMock()

      await handlePrintBatchesInvalidateFeedback({
        queryClient,
        hasSuccess: false,
      })

      expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    })
  })

  describe('success result predicates', () => {
    it('detects a single successful result item', () => {
      expect(hasSuccessfulPrintResultItem(createResultItem('success'))).toBe(true)
      expect(hasSuccessfulPrintResultItem(createResultItem('failed'))).toBe(false)
    })

    it('detects success from a result item collection', () => {
      expect(hasSuccessfulPrintResultItems([
        createResultItem('failed'),
        createResultItem('success'),
      ])).toBe(true)
      expect(hasSuccessfulPrintResultItems([
        createResultItem('failed'),
        createResultItem('skipped'),
      ])).toBe(false)
    })
  })
})
