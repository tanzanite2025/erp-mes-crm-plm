import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LinearBarcodeResolvedPrintLine } from '@/features/code-center/utils/linear-barcode-print-resolver'
import {
  buildBatchPrintResult,
  buildFailedResultItem,
  buildSkippedBlockedResultItem,
  buildSkippedUnnumberedResultItem,
  buildSuccessResultItem,
  resolveBatchPrintResultFilter,
  type BatchPrintResultItem,
} from './linear-barcode-print-result-builder'

function translate(
  key: string,
  params?: Record<string, string | number>
) {
  return params ? `${key}:${JSON.stringify(params)}` : key
}

const tMock = vi.fn(translate)

function createLine(
  overrides: Partial<LinearBarcodeResolvedPrintLine> = {}
): LinearBarcodeResolvedPrintLine {
  return {
    key: 'line-1',
    lineNo: 1,
    productLabel: 'Demo Product',
    isReady: true,
    issues: [],
    printInput: {
      productId: 'product-1',
      quantity: 3,
      sequenceRuleKey: 'SEQ-001',
      mockInputs: {
        serial: 'SN-001',
      },
      barcodeConfig: {
        serialNumber: 'BC-001',
      },
    },
    ...overrides,
  } as unknown as LinearBarcodeResolvedPrintLine
}

function createResultItem(status: 'success' | 'failed' | 'skipped'): BatchPrintResultItem {
  return {
    key: `item-${status}`,
    lineNo: 1,
    productLabel: 'Demo Product',
    status,
    message: `message-${status}`,
    serial: 'SN-001',
    barcodeSerial: 'BC-001',
  }
}

describe('linear-barcode-print-result-builder', () => {
  let toLocaleStringSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    tMock.mockClear()
    toLocaleStringSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('2026-04-23 10:00:00')
  })

  afterEach(() => {
    toLocaleStringSpy.mockRestore()
  })

  describe('buildBatchPrintResult', () => {
    it('builds counts from items and stamps finishedAt', () => {
      const result = buildBatchPrintResult({
        items: [
          createResultItem('success'),
          createResultItem('failed'),
          createResultItem('skipped'),
        ],
        totalLines: 6,
        printableLines: 4,
      })

      expect(result).toEqual({
        totalLines: 6,
        printableLines: 4,
        successCount: 1,
        failureCount: 1,
        skippedCount: 1,
        finishedAt: '2026-04-23 10:00:00',
        items: [
          createResultItem('success'),
          createResultItem('failed'),
          createResultItem('skipped'),
        ],
      })
    })

    it('preserves previous totals when previous metadata exists', () => {
      const result = buildBatchPrintResult({
        items: [createResultItem('success')],
        totalLines: 3,
        printableLines: 2,
        previous: {
          totalLines: 10,
          printableLines: 7,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          finishedAt: 'old',
          items: [],
        },
      })

      expect(result.totalLines).toBe(10)
      expect(result.printableLines).toBe(7)
      expect(result.successCount).toBe(1)
      expect(result.failureCount).toBe(0)
      expect(result.skippedCount).toBe(0)
      expect(result.finishedAt).toBe('2026-04-23 10:00:00')
    })
  })

  describe('resolveBatchPrintResultFilter', () => {
    it('returns failed when any failed item exists', () => {
      expect(resolveBatchPrintResultFilter([
        createResultItem('success'),
        createResultItem('failed'),
      ])).toBe('failed')
    })

    it('returns all when no failed item exists', () => {
      expect(resolveBatchPrintResultFilter([
        createResultItem('success'),
        createResultItem('skipped'),
      ])).toBe('all')
    })
  })

  describe('buildSkippedBlockedResultItem', () => {
    it('prefers the first line issue as the message', () => {
      const line = createLine({ issues: ['缺少产品绑定'] })

      expect(buildSkippedBlockedResultItem(line, tMock)).toEqual({
        key: 'line-1',
        lineNo: 1,
        productLabel: 'Demo Product',
        status: 'skipped',
        message: '缺少产品绑定',
        serial: 'SN-001',
        barcodeSerial: 'BC-001',
      })
    })

    it('falls back to the localized blocked message and placeholder values', () => {
      const line = createLine({
        issues: [],
        printInput: undefined,
      })

      expect(buildSkippedBlockedResultItem(line, tMock)).toEqual({
        key: 'line-1',
        lineNo: 1,
        productLabel: 'Demo Product',
        status: 'skipped',
        message: translate('codeCenter.linearBarcode.print.sections.result.messages.skippedBlocked'),
        serial: '--',
        barcodeSerial: '--',
      })
    })
  })

  describe('buildSkippedUnnumberedResultItem', () => {
    it('builds the skipped unnumbered result item', () => {
      const line = createLine()

      expect(buildSkippedUnnumberedResultItem(line, tMock)).toEqual({
        key: 'line-1',
        lineNo: 1,
        productLabel: 'Demo Product',
        status: 'skipped',
        message: translate('codeCenter.linearBarcode.print.sections.result.messages.skippedUnnumbered'),
        serial: 'SN-001',
        barcodeSerial: 'BC-001',
      })
    })
  })

  describe('buildSuccessResultItem', () => {
    it('builds a success result item with the provided barcode serial', () => {
      const line = createLine()

      expect(buildSuccessResultItem(line, 'BC-999', tMock)).toEqual({
        key: 'line-1',
        lineNo: 1,
        productLabel: 'Demo Product',
        status: 'success',
        message: translate('codeCenter.linearBarcode.print.sections.result.messages.success'),
        serial: 'SN-001',
        barcodeSerial: 'BC-999',
      })
    })

    it('falls back to placeholder when the provided barcode serial is empty', () => {
      const line = createLine({
        printInput: undefined,
      })

      expect(buildSuccessResultItem(line, '', tMock)).toEqual({
        key: 'line-1',
        lineNo: 1,
        productLabel: 'Demo Product',
        status: 'success',
        message: translate('codeCenter.linearBarcode.print.sections.result.messages.success'),
        serial: '--',
        barcodeSerial: '--',
      })
    })
  })

  describe('buildFailedResultItem', () => {
    it('prefers the explicit Error message', () => {
      const line = createLine()

      expect(buildFailedResultItem(line, new Error('submit failed'), tMock)).toEqual({
        key: 'line-1',
        lineNo: 1,
        productLabel: 'Demo Product',
        status: 'failed',
        message: 'submit failed',
        serial: 'SN-001',
        barcodeSerial: 'BC-001',
      })
    })

    it('falls back to the localized failed message for non-Error values', () => {
      const line = createLine({
        printInput: undefined,
      })

      expect(buildFailedResultItem(line, 'unexpected', tMock)).toEqual({
        key: 'line-1',
        lineNo: 1,
        productLabel: 'Demo Product',
        status: 'failed',
        message: translate('codeCenter.linearBarcode.print.sections.result.messages.failed'),
        serial: '--',
        barcodeSerial: '--',
      })
    })
  })
})
