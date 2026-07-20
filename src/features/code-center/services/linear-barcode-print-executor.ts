import { createLogger } from '@/lib/logger'
import { type BarcodeConfig } from '@/features/engineering/data/schema'
import { BarcodeService } from '@/features/print-mgmt/services/barcode-service'
import {
  PrintRecordService,
  type LinearBarcodeInventoryItem,
  type PrintBatch,
} from '@/features/print-mgmt/services/print-record-service'
import {
  openLinearBarcodePrintPreview,
  type LinearBarcodePrintableLabel,
  type LinearBarcodePrintPreviewSession,
} from './linear-barcode-print-preview'
import { assertSupportedLinearBarcodePrintQuantity } from './linear-barcode-print-safety'

const logger = createLogger('LinearBarcodePrintExecutor')

export interface LinearBarcodePrintExecutionParams {
  salesOrderId: string
  salesOrderLineNo: number
  quantity: number
  barcodeConfig: BarcodeConfig
}

export interface LinearBarcodePrintExecutionResult {
  code: string
  codes: string[]
  fullText: string
  fullTexts: string[]
  serialNumber: string
  serialNumbers: string[]
  startSerialNumber: string
  endSerialNumber: string
  batch: PrintBatch
  items: LinearBarcodeInventoryItem[]
}

export interface LinearBarcodePrintJob {
  key: string
  params: LinearBarcodePrintExecutionParams
}

export interface LinearBarcodePrintJobResult {
  key: string
  result?: LinearBarcodePrintExecutionResult
  error?: unknown
}

interface PreparedLinearBarcodePrint {
  result: LinearBarcodePrintExecutionResult
  labels: LinearBarcodePrintableLabel[]
}

async function scrapBatch(batchId: string) {
  try {
    await PrintRecordService.scrap(batchId)
  } catch (scrapError) {
    logger.error('Failed to scrap a linear-barcode batch', scrapError)
  }
}

async function prepareLinearBarcodePrint(
  params: LinearBarcodePrintExecutionParams,
  preview: LinearBarcodePrintPreviewSession
): Promise<PreparedLinearBarcodePrint> {
  assertSupportedLinearBarcodePrintQuantity(params.quantity)
  const reservation = await PrintRecordService.createLinearBarcodeBatch({
    salesOrderId: params.salesOrderId,
    salesOrderLineNo: params.salesOrderLineNo,
    quantity: params.quantity,
  })

  try {
    const labels: LinearBarcodePrintableLabel[] = []
    const fullTexts: string[] = []
    for (const item of reservation.items) {
      const barcodeDataUrl = await preview.renderBarcode(item.code)
      const fullText = BarcodeService.getFullText(
        { ...params.barcodeConfig, serialNumber: item.serialNumber },
        item.code
      )
      fullTexts.push(fullText)
      labels.push({
        barcodeDataUrl,
        batchNo: reservation.batch.batchNo,
        code: item.code,
        fullText,
        templateName: reservation.batch.templateName,
      })
    }

    const firstItem = reservation.items[0]
    const lastItem = reservation.items[reservation.items.length - 1]
    if (!firstItem || !lastItem) {
      throw new Error(
        'The linear-barcode batch did not return inventory items.'
      )
    }

    return {
      labels,
      result: {
        code: firstItem.code,
        codes: reservation.items.map((item) => item.code),
        fullText: fullTexts[0] || firstItem.code,
        fullTexts,
        serialNumber: firstItem.serialNumber,
        serialNumbers: reservation.items.map((item) => item.serialNumber),
        startSerialNumber: firstItem.serialNumber,
        endSerialNumber: lastItem.serialNumber,
        batch: reservation.batch,
        items: reservation.items,
      },
    }
  } catch (error) {
    await scrapBatch(reservation.batch.id)
    throw error
  }
}

export async function executeLinearBarcodePrint(
  params: LinearBarcodePrintExecutionParams
): Promise<LinearBarcodePrintExecutionResult> {
  assertSupportedLinearBarcodePrintQuantity(params.quantity)
  const preview = openLinearBarcodePrintPreview()
  let prepared: PreparedLinearBarcodePrint | undefined

  try {
    prepared = await prepareLinearBarcodePrint(params, preview)
    preview.showLabels(prepared.labels)
    return prepared.result
  } catch (error) {
    if (prepared) {
      await scrapBatch(prepared.result.batch.id)
    }
    preview.showError(
      error instanceof Error
        ? error.message
        : 'Failed to prepare the Code128 print preview.'
    )
    throw error
  }
}

export async function executeLinearBarcodePrintJobs(
  jobs: LinearBarcodePrintJob[]
): Promise<LinearBarcodePrintJobResult[]> {
  if (jobs.length === 0) return []
  const preview = openLinearBarcodePrintPreview()
  const preparedJobs: Array<{
    key: string
    prepared: PreparedLinearBarcodePrint
  }> = []
  const outcomes: LinearBarcodePrintJobResult[] = []

  for (const job of jobs) {
    if (!preview.isOpen()) {
      outcomes.push({
        key: job.key,
        error: new Error('The linear-barcode print preview window was closed.'),
      })
      continue
    }
    try {
      const prepared = await prepareLinearBarcodePrint(job.params, preview)
      preparedJobs.push({ key: job.key, prepared })
      outcomes.push({ key: job.key, result: prepared.result })
    } catch (error) {
      outcomes.push({ key: job.key, error })
    }
  }

  if (preparedJobs.length === 0) {
    preview.showError('No linear-barcode labels could be prepared.')
    return outcomes
  }

  try {
    preview.showLabels(preparedJobs.flatMap(({ prepared }) => prepared.labels))
    return outcomes
  } catch (error) {
    await Promise.all(
      preparedJobs.map(({ prepared }) => scrapBatch(prepared.result.batch.id))
    )
    const failedKeys = new Set(preparedJobs.map(({ key }) => key))
    return outcomes.map((outcome) =>
      failedKeys.has(outcome.key) ? { key: outcome.key, error } : outcome
    )
  }
}
