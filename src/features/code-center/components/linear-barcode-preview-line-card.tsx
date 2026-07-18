import { Printer } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type LinearBarcodeResolvedPrintLine } from '../utils/linear-barcode-print-resolver'

interface LinearBarcodePreviewLineCardProps {
  line: LinearBarcodeResolvedPrintLine
  hasRealNumber: boolean
  hasOpenedPreview: boolean
  isPrinting: boolean
  onPrint: () => void | Promise<void>
}

export function LinearBarcodePreviewLineCard({
  line,
  hasRealNumber,
  hasOpenedPreview,
  isPrinting,
  onPrint,
}: LinearBarcodePreviewLineCardProps) {
  const { t } = useLanguage()

  return (
    <div className='rounded-xl border border-dashed bg-muted/10 px-3 py-3'>
      <div className='mb-2 flex items-start justify-between gap-3'>
        <div>
          <div className='text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
            {t('codeCenter.linearBarcode.print.sections.preview.fields.lineNo')}{' '}
            #{line.lineNo}
          </div>
          <div className='text-sm font-black text-foreground'>
            {line.productLabel}
          </div>
        </div>
        <div className='flex flex-col items-end gap-2'>
          <Badge
            className={
              line.isReady
                ? 'border-none bg-emerald-500/10 text-emerald-700'
                : 'border-none bg-rose-500/10 text-rose-700'
            }
          >
            {line.isReady
              ? t(
                  'codeCenter.linearBarcode.print.sections.preview.states.lineReady'
                )
              : t(
                  'codeCenter.linearBarcode.print.sections.preview.states.lineBlocked'
                )}
          </Badge>
          {line.isReady && line.printInput ? (
            hasRealNumber ? (
              <Button
                type='button'
                onClick={() => void onPrint()}
                disabled={isPrinting || hasOpenedPreview}
                className='bg-blue-600 font-bold text-white hover:bg-blue-700'
              >
                <Printer className='mr-2 h-4 w-4' />
                {hasOpenedPreview
                  ? t(
                      'codeCenter.linearBarcode.print.sections.preview.actions.previewReady'
                    )
                  : isPrinting
                    ? t(
                        'codeCenter.linearBarcode.print.sections.preview.actions.printing',
                        { quantity: line.printInput.quantity }
                      )
                    : t(
                        'codeCenter.linearBarcode.print.sections.preview.actions.printNow',
                        { quantity: line.printInput.quantity }
                      )}
              </Button>
            ) : (
              <span className='text-[9px] font-bold text-muted-foreground/60'>
                {t(
                  'codeCenter.linearBarcode.print.sections.preview.states.awaitingRealNumber'
                )}
              </span>
            )
          ) : null}
        </div>
      </div>
      <div className='grid gap-1 text-[10px]'>
        <div>
          {t(
            'codeCenter.linearBarcode.print.sections.preview.fields.modelCode'
          )}
          : {line.printInput?.mockInputs.model || '--'}
        </div>
        <div>
          {t(
            'codeCenter.linearBarcode.print.sections.preview.fields.holePrefix'
          )}
          : {line.printInput?.mockInputs.holePrefix || '--'}
        </div>
        <div>
          {t(
            'codeCenter.linearBarcode.print.sections.preview.fields.appearanceCode'
          )}
          : {line.printInput?.mockInputs.appearance || '--'}
        </div>
        <div>
          {t(
            'codeCenter.linearBarcode.print.sections.preview.fields.holeCount'
          )}
          : {line.printInput?.mockInputs.holes || '--'}
        </div>
        <div>
          {t('codeCenter.linearBarcode.print.sections.preview.fields.quantity')}
          : {`${line.quantity.toLocaleString()} ${line.uom}`}
        </div>
        <div>
          {t(
            'codeCenter.linearBarcode.print.sections.preview.fields.sequenceRuleKey'
          )}
          : {line.printInput?.sequenceRuleKey || '--'}
        </div>
        <div>
          {t(
            'codeCenter.linearBarcode.print.sections.preview.fields.mockSerial'
          )}
          : {line.printInput?.mockInputs.serial || '--'}
        </div>
        <div>
          {t(
            'codeCenter.linearBarcode.print.sections.preview.fields.barcodeSerial'
          )}
          : {line.printInput?.barcodeConfig.serialNumber || '--'}
        </div>
      </div>
      {line.issues.length > 0 && (
        <div className='mt-3 rounded-lg border border-dashed border-rose-300/40 bg-rose-50/40 px-3 py-2 text-[10px] text-rose-700'>
          <div className='mb-1 font-black tracking-[0.2em] uppercase'>
            {t(
              'codeCenter.linearBarcode.print.sections.preview.fields.blockReason'
            )}
          </div>
          <div className='space-y-1'>
            {line.issues.map((issue, index) => (
              <div key={`${line.key}-issue-${index}`}>{issue}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
