import { type BarcodeConfig } from '@/features/engineering/data/schema'
import { BarcodeService } from '@/features/print-mgmt/services/barcode-service'
import { PrintRecordService, type PrintBatch } from '@/features/print-mgmt/services/print-record-service'
import { createLogger } from '@/lib/logger'

 const logger = createLogger('LinearBarcodePrintExecutor')

export interface LinearBarcodePrintExecutionParams {
  productId: string
  quantity: number
  templateName: string
  barcodeConfig: BarcodeConfig
}

export interface LinearBarcodePrintExecutionResult {
  code: string
  fullText: string
  serialNumber: string
  batch: PrintBatch
  sn: string
}

export async function executeLinearBarcodePrint({
  productId,
  quantity,
  templateName,
  barcodeConfig,
}: LinearBarcodePrintExecutionParams): Promise<LinearBarcodePrintExecutionResult> {
  const code = BarcodeService.generateCode(barcodeConfig)
  const fullText = BarcodeService.getFullText(barcodeConfig, code)
  logger.info(`Preparing linear barcode print: quantity=${quantity}, template=${templateName}`)
  logger.info(`Generated code: ${code}, readable text: ${fullText}`)
  const { batch, sn } = await PrintRecordService.atomicPrint({
    templateName,
    productId,
    quantity,
  })

  return {
    code,
    fullText,
    serialNumber: barcodeConfig.serialNumber,
    batch,
    sn,
  }
}
