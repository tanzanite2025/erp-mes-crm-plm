import { createLogger } from '@/lib/logger'
import type { IssuedProductCodeRecord } from '@/lib/product-code/issued-product-code-inventory-contracts'
import {
  formatProductCodeLabelReadableText,
  type ProductCodeLabelReadableTextOptions,
} from '@/lib/product-code/product-code-label-readable-text-formatter'
import {
  PrintRecordService,
  type PrintBatch,
} from '@/features/print-mgmt/services/print-record-service'
import {
  openProductCodeLabelPrintPreview,
  type ProductCodePrintableLabel,
  type ProductCodeLabelPrintPreviewSession,
} from './product-code-label-print-preview'
import { assertSupportedProductCodeLabelPrintQuantity } from './product-code-label-print-quantity-constraints'

const logger = createLogger('ProductCodeLabelPrintExecutor')

export interface ProductCodeLabelPrintExecutionParams {
  salesOrderId: string
  salesOrderLineId?: number
  salesOrderLineNo: number
  quantity: number
  labelReadableTextOptions: ProductCodeLabelReadableTextOptions
}

export interface ProductCodeLabelPrintExecutionResult {
  code: string
  codes: string[]
  fullText: string
  fullTexts: string[]
  serialNumber: string
  serialNumbers: string[]
  startSerialNumber: string
  endSerialNumber: string
  batch: PrintBatch
  items: IssuedProductCodeRecord[]
}

export interface ProductCodeLabelPrintJob {
  key: string
  params: ProductCodeLabelPrintExecutionParams
}

export interface ProductCodeLabelPrintJobResult {
  key: string
  result?: ProductCodeLabelPrintExecutionResult
  error?: unknown
}

interface PreparedProductCodeLabelPrint {
  result: ProductCodeLabelPrintExecutionResult
  labels: ProductCodePrintableLabel[]
}

async function scrapIssuedProductCodePrintBatchOnFailure(batchId: string) {
  try {
    await PrintRecordService.scrap(batchId)
  } catch (scrapError) {
    logger.error('Failed to scrap a linear-barcode batch', scrapError)
  }
}

async function prepareIssuedProductCodeLabelsForPrint(
  params: ProductCodeLabelPrintExecutionParams,
  preview: ProductCodeLabelPrintPreviewSession
): Promise<PreparedProductCodeLabelPrint> {
  assertSupportedProductCodeLabelPrintQuantity(params.quantity)
  const reservation = await PrintRecordService.createLinearBarcodeBatch({
    salesOrderId: params.salesOrderId,
    salesOrderLineId: params.salesOrderLineId,
    salesOrderLineNo: params.salesOrderLineNo,
    quantity: params.quantity,
  })

  try {
    const labels: ProductCodePrintableLabel[] = []
    const fullTexts: string[] = []
    for (const item of reservation.items) {
      const symbolImages = await preview.renderProductCodeSymbols(item.code)
      const fullText = formatProductCodeLabelReadableText(
        item.code,
        params.labelReadableTextOptions
      )
      fullTexts.push(fullText)
      labels.push({
        ...symbolImages,
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
    await scrapIssuedProductCodePrintBatchOnFailure(reservation.batch.id)
    throw error
  }
}

export async function executeProductCodeLabelPrint(
  params: ProductCodeLabelPrintExecutionParams
): Promise<ProductCodeLabelPrintExecutionResult> {
  assertSupportedProductCodeLabelPrintQuantity(params.quantity)
  const preview = openProductCodeLabelPrintPreview()
  let prepared: PreparedProductCodeLabelPrint | undefined

  try {
    prepared = await prepareIssuedProductCodeLabelsForPrint(params, preview)
    preview.showLabels(prepared.labels)
    return prepared.result
  } catch (error) {
    if (prepared) {
      await scrapIssuedProductCodePrintBatchOnFailure(prepared.result.batch.id)
    }
    preview.showError(
      error instanceof Error
        ? error.message
        : 'Failed to prepare the product-code print preview.'
    )
    throw error
  }
}

export async function executeProductCodeLabelPrintJobs(
  jobs: ProductCodeLabelPrintJob[]
): Promise<ProductCodeLabelPrintJobResult[]> {
  if (jobs.length === 0) return []
  const preview = openProductCodeLabelPrintPreview()
  const preparedJobs: Array<{
    key: string
    prepared: PreparedProductCodeLabelPrint
  }> = []
  const outcomes: ProductCodeLabelPrintJobResult[] = []

  for (const job of jobs) {
    if (!preview.isOpen()) {
      outcomes.push({
        key: job.key,
        error: new Error('The linear-barcode print preview window was closed.'),
      })
      continue
    }
    try {
      const prepared = await prepareIssuedProductCodeLabelsForPrint(
        job.params,
        preview
      )
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
      preparedJobs.map(({ prepared }) =>
        scrapIssuedProductCodePrintBatchOnFailure(prepared.result.batch.id)
      )
    )
    const failedKeys = new Set(preparedJobs.map(({ key }) => key))
    return outcomes.map((outcome) =>
      failedKeys.has(outcome.key) ? { key: outcome.key, error } : outcome
    )
  }
}
