import { createLogger } from '@/lib/logger'
import {
  assembleCanonicalLinearBarcodeCode,
  type LinearBarcodeMockInputs,
} from '@/features/basic-settings/data/linear-barcode-protocol'
import { type BarcodeConfig } from '@/features/engineering/data/schema'
import { BarcodeService } from '@/features/print-mgmt/services/barcode-service'
import {
  PrintRecordService,
  type PrintBatch,
} from '@/features/print-mgmt/services/print-record-service'
import { openLinearBarcodePrintPreview } from './linear-barcode-print-preview'
import { assertSupportedLinearBarcodePrintQuantity } from './linear-barcode-print-safety'

const logger = createLogger('LinearBarcodePrintExecutor')

export interface LinearBarcodePrintExecutionParams {
  productId: string
  quantity: number
  templateName: string
  barcodeInput: LinearBarcodeMockInputs
  barcodeConfig: BarcodeConfig
}

export interface LinearBarcodePrintExecutionResult {
  code: string
  fullText: string
  serialNumber: string
  batch: PrintBatch
}

export async function executeLinearBarcodePrint({
  productId,
  quantity,
  templateName,
  barcodeInput,
  barcodeConfig,
}: LinearBarcodePrintExecutionParams): Promise<LinearBarcodePrintExecutionResult> {
  assertSupportedLinearBarcodePrintQuantity(quantity)
  const code = assembleCanonicalLinearBarcodeCode(barcodeInput)
  const fullText = BarcodeService.getFullText(barcodeConfig, code)
  const preview = openLinearBarcodePrintPreview()
  let batch: PrintBatch | undefined

  logger.info(
    `Preparing linear barcode print: quantity=${quantity}, template=${templateName}`
  )
  logger.info(`Generated code: ${code}, readable text: ${fullText}`)

  try {
    const barcodeDataUrl = await preview.renderBarcode(code)
    batch = await PrintRecordService.addBatch({
      templateName,
      productId,
      quantity,
      startSn: barcodeInput.serial,
      fullCode: code,
    })
    preview.showLabels([
      {
        barcodeDataUrl,
        batchNo: batch.batchNo,
        code,
        fullText,
        templateName,
      },
    ])

    return {
      code,
      fullText,
      serialNumber: barcodeConfig.serialNumber,
      batch,
    }
  } catch (error) {
    if (batch) {
      try {
        await PrintRecordService.scrap(batch.id)
      } catch (scrapError) {
        logger.error(
          'Failed to scrap a batch after preview failure',
          scrapError
        )
      }
    }

    preview.showError(
      error instanceof Error
        ? error.message
        : 'Failed to prepare the Code128 print preview.'
    )
    throw error
  }
}
