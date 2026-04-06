import { useState } from 'react'
import { Printer, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'
import { BarcodeService } from '../services/barcode-service'
import { PrintRecordService } from '../services/print-record-service'
import { type BarcodeConfig } from '../../engineering/data/schema'

const logger = createLogger('PrintAdapter')

interface PrintAdapterProps {
  productId: string
  config: BarcodeConfig
  quantity: number
  onPrintComplete?: () => void
  templateName?: string
}

export function PrintAdapter({
  productId,
  config,
  quantity,
  onPrintComplete,
  templateName,
}: PrintAdapterProps) {
  const { t } = useLanguage()
  const [isPrinting, setIsPrinting] = useState(false)

  const handleBatchPrint = async () => {
    setIsPrinting(true)

    try {
      const code = BarcodeService.generateCode(config)
      const fullText = BarcodeService.getFullText(config, code)

      logger.info(t('printMgmt.adapter.preparing', { quantity }))
      logger.info(`Start code: ${code}, readable text: ${fullText}`)

      await PrintRecordService.atomicPrint({
        templateName: templateName || t('printMgmt.adapter.defaultTemplateName'),
        productId,
        quantity,
      })

      toast.success(t('printMgmt.adapter.submitSuccess', { quantity }), {
        description: t('printMgmt.adapter.submitSuccessDescription', {
          serialNumber: config.serialNumber,
        }),
        icon: <CheckCircle2 className='text-green-600' />,
      })

      onPrintComplete?.()
    } catch (error) {
      logger.error('Print failed', error)
      toast.error(t('printMgmt.adapter.submitFailed'))
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Button
      onClick={handleBatchPrint}
      disabled={isPrinting}
      className='bg-blue-600 hover:bg-blue-700 text-white font-bold'
    >
      <Printer className='mr-2 h-4 w-4' />
      {isPrinting
        ? t('printMgmt.adapter.printing', { quantity })
        : t('printMgmt.adapter.printNow', { quantity })}
    </Button>
  )
}
