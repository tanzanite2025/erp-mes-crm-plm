import type { TranslationKey } from '@/locales'
import { type LinearBarcodeResolvedPrintLine } from '@/features/code-center/utils/linear-barcode-print-resolver'

export type BatchPrintResultItemStatus = 'success' | 'failed' | 'skipped'
export type BatchPrintResultFilter = 'all' | BatchPrintResultItemStatus

export interface BatchPrintResultItem {
  key: string
  lineNo: number
  productLabel: string
  status: BatchPrintResultItemStatus
  message: string
  serial: string
  barcodeSerial: string
}

export interface BatchPrintResult {
  totalLines: number
  printableLines: number
  successCount: number
  failureCount: number
  skippedCount: number
  finishedAt: string
  items: BatchPrintResultItem[]
}

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

interface BuildBatchPrintResultParams {
  items: BatchPrintResultItem[]
  totalLines: number
  printableLines: number
  previous?: BatchPrintResult
}

export function buildBatchPrintResult({
  items,
  totalLines,
  printableLines,
  previous,
}: BuildBatchPrintResultParams): BatchPrintResult {
  return {
    totalLines: previous?.totalLines ?? totalLines,
    printableLines: previous?.printableLines ?? printableLines,
    successCount: items.filter((item) => item.status === 'success').length,
    failureCount: items.filter((item) => item.status === 'failed').length,
    skippedCount: items.filter((item) => item.status === 'skipped').length,
    finishedAt: new Date().toLocaleString(),
    items,
  }
}

export function resolveBatchPrintResultFilter(
  items: BatchPrintResultItem[]
): BatchPrintResultFilter {
  return items.some((item) => item.status === 'failed') ? 'failed' : 'all'
}

export function buildSkippedBlockedResultItem(
  line: LinearBarcodeResolvedPrintLine,
  t: TranslateFn
): BatchPrintResultItem {
  return {
    key: line.key,
    lineNo: line.lineNo,
    productLabel: line.productLabel,
    status: 'skipped',
    message:
      line.issues[0] ||
      t(
        'codeCenter.linearBarcode.print.sections.result.messages.skippedBlocked'
      ),
    serial: line.printInput?.mockInputs.serial || '--',
    barcodeSerial: line.printInput?.barcodeConfig.serialNumber || '--',
  }
}

export function buildSkippedUnnumberedResultItem(
  line: LinearBarcodeResolvedPrintLine,
  t: TranslateFn
): BatchPrintResultItem {
  return {
    key: line.key,
    lineNo: line.lineNo,
    productLabel: line.productLabel,
    status: 'skipped',
    message: t(
      'codeCenter.linearBarcode.print.sections.result.messages.skippedUnnumbered'
    ),
    serial: line.printInput?.mockInputs.serial || '--',
    barcodeSerial: line.printInput?.barcodeConfig.serialNumber || '--',
  }
}

export function buildSuccessResultItem(
  line: LinearBarcodeResolvedPrintLine,
  barcodeSerial: string,
  t: TranslateFn
): BatchPrintResultItem {
  return {
    key: line.key,
    lineNo: line.lineNo,
    productLabel: line.productLabel,
    status: 'success',
    message: t(
      'codeCenter.linearBarcode.print.sections.result.messages.success'
    ),
    serial: line.printInput?.mockInputs.serial || '--',
    barcodeSerial: barcodeSerial || '--',
  }
}

export function buildFailedResultItem(
  line: LinearBarcodeResolvedPrintLine,
  error: unknown,
  t: TranslateFn
): BatchPrintResultItem {
  return {
    key: line.key,
    lineNo: line.lineNo,
    productLabel: line.productLabel,
    status: 'failed',
    message:
      error instanceof Error && error.message
        ? error.message
        : t('codeCenter.linearBarcode.print.sections.result.messages.failed'),
    serial: line.printInput?.mockInputs.serial || '--',
    barcodeSerial: line.printInput?.barcodeConfig.serialNumber || '--',
  }
}
