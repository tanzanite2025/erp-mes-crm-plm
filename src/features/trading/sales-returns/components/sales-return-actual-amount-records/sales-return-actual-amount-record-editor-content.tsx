import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DocumentEvidenceManager } from '@/features/sales-document/components/document-evidence-manager'
import type { OrderEvidence } from '@/features/trading/data/schema'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import { useLanguage } from '@/context/language-provider'

type SalesReturnActualAmountRecordEditorContentProps = {
  record: SalesReturnRecord
  actualAmount: string
  actualAmountNote: string
  actualAmountEvidences: OrderEvidence[]
  onActualAmountChange: (value: string) => void
  onActualAmountNoteChange: (value: string) => void
  onActualAmountEvidencesChange: (evidences: OrderEvidence[]) => void
}

export function SalesReturnActualAmountRecordEditorContent({
  record,
  actualAmount,
  actualAmountNote,
  actualAmountEvidences,
  onActualAmountChange,
  onActualAmountNoteChange,
  onActualAmountEvidencesChange,
}: SalesReturnActualAmountRecordEditorContentProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-4 px-6 py-5'>
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-4 py-3'>
          <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {t('trading.salesReturns.actualAmountEntryDialog.summaryOrderNo')}
          </p>
          <p className='mt-2 text-sm font-black'>{record.salesOrderNo}</p>
        </div>
        <div className='rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-4 py-3'>
          <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {t('trading.salesReturns.actualAmountEntryDialog.summaryCustomer')}
          </p>
          <p className='mt-2 text-sm font-black'>{record.customerName}</p>
        </div>
        <div className='rounded-[24px] border border-dashed border-amber-500/20 bg-amber-500/5 px-4 py-3'>
          <p className='text-[10px] font-black uppercase tracking-widest text-amber-600/70'>
            {t('trading.salesReturns.actualAmountEntryDialog.summaryEstimatedAmount')}
          </p>
          <p className='mt-2 text-sm font-black text-amber-700'>
            ¥ {record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className='rounded-[24px] border border-dashed border-primary/20 bg-primary/5 px-4 py-3'>
          <p className='text-[10px] font-black uppercase tracking-widest text-primary/70'>
            {t('trading.salesReturns.actualAmountEntryDialog.summaryActualAmount')}
          </p>
          <p className='mt-2 text-sm font-black text-primary'>
            {record.actualReturnAmountRecordedAt
              ? `¥ ${record.actualReturnAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : t('trading.salesReturns.queryShell.actualAmountEmpty')}
          </p>
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]'>
        <div className='space-y-1.5'>
          <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
            {t('trading.salesReturns.actualAmountEntryDialog.amountLabel')}
          </label>
          <Input
            type='number'
            min={0}
            step='0.01'
            value={actualAmount}
            onChange={(event) => onActualAmountChange(event.target.value)}
            placeholder={t('trading.salesReturns.actualAmountEntryDialog.amountPlaceholder')}
            className='h-12 rounded-2xl border-none bg-muted/50 text-right font-black tabular-nums'
          />
        </div>
        <div className='space-y-1.5'>
          <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
            {t('trading.salesReturns.actualAmountEntryDialog.amountNoteLabel')}
          </label>
          <Textarea
            value={actualAmountNote}
            onChange={(event) => onActualAmountNoteChange(event.target.value)}
            placeholder={t('trading.salesReturns.actualAmountEntryDialog.amountNotePlaceholder')}
            rows={2}
            className='min-h-[96px] rounded-2xl border-none bg-muted/50'
          />
        </div>
      </div>

      <div className='rounded-[24px] border border-dashed border-border/70 bg-muted/5 p-3'>
        <DocumentEvidenceManager
          evidences={actualAmountEvidences}
          onChange={onActualAmountEvidencesChange}
          enableCameraCapture
          compact
          title={t('trading.salesReturns.actualAmountEntryDialog.evidenceTitle')}
          hint=''
          emptyText={t('trading.salesReturns.actualAmountEntryDialog.evidenceEmpty')}
          uploadActionText={t(
            'trading.salesReturns.actualAmountEntryDialog.evidenceUploadAction'
          )}
          cameraActionText={t(
            'trading.salesReturns.actualAmountEntryDialog.evidenceCameraAction'
          )}
          noteLabel={t(
            'trading.salesReturns.actualAmountEntryDialog.evidenceNoteLabel'
          )}
          notePlaceholder={t(
            'trading.salesReturns.actualAmountEntryDialog.evidenceNotePlaceholder'
          )}
          uploadSuccessText={t(
            'trading.salesReturns.actualAmountEntryDialog.evidenceUploadSuccess'
          )}
          uploadFailedText={t(
            'trading.salesReturns.actualAmountEntryDialog.evidenceUploadFailed'
          )}
        />
      </div>
    </div>
  )
}
