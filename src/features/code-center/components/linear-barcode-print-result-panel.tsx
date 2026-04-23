import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import {
  type BatchPrintResult,
  type BatchPrintResultFilter,
  type BatchPrintResultItem,
} from '../utils/linear-barcode-print-result-builder'

interface LinearBarcodePrintResultPanelProps {
  batchPrintResult: BatchPrintResult
  filteredResultItems: BatchPrintResultItem[]
  resultFilter: BatchPrintResultFilter
  retryingKeys: Record<string, boolean>
  isRetryingFailedOnly: boolean
  onRetryFailedOnly: () => void | Promise<void>
  onRetryItem: (itemKey: string) => void | Promise<void>
  onResultFilterChange: (filter: BatchPrintResultFilter) => void
}

export function LinearBarcodePrintResultPanel({
  batchPrintResult,
  filteredResultItems,
  resultFilter,
  retryingKeys,
  isRetryingFailedOnly,
  onRetryFailedOnly,
  onRetryItem,
  onResultFilterChange,
}: LinearBarcodePrintResultPanelProps) {
  const { t } = useLanguage()

  return (
    <div className='space-y-3 rounded-xl border border-dashed border-primary/20 bg-primary/5 px-3 py-3'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2'>
            <div className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/60'>
              {t('codeCenter.linearBarcode.print.sections.result.title')}
            </div>
            {resultFilter === 'failed' && (
              <Badge className='rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 hover:bg-rose-100'>
                {batchPrintResult.failureCount}
              </Badge>
            )}
          </div>
          <div className='text-[10px] text-muted-foreground'>
            {t('codeCenter.linearBarcode.print.sections.result.description')}
          </div>
        </div>
        <span className='text-[9px] font-mono text-muted-foreground/70'>
          {batchPrintResult.finishedAt}
        </span>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => void onRetryFailedOnly()}
          disabled={
            isRetryingFailedOnly ||
            !batchPrintResult.items.some((item) => item.status === 'failed')
          }
          className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'
        >
          {isRetryingFailedOnly
            ? t('codeCenter.linearBarcode.print.sections.result.actions.retryingFailedOnly')
            : t('codeCenter.linearBarcode.print.sections.result.actions.retryFailedOnly')}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={resultFilter === 'all' ? 'default' : 'outline'}
          onClick={() => onResultFilterChange('all')}
          className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'
        >
          {t('codeCenter.linearBarcode.print.sections.result.filters.all')}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={resultFilter === 'success' ? 'default' : 'outline'}
          onClick={() => onResultFilterChange('success')}
          className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'
        >
          {t('codeCenter.linearBarcode.print.sections.result.filters.success')}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={resultFilter === 'failed' ? 'default' : 'outline'}
          onClick={() => onResultFilterChange('failed')}
          className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'
        >
          {t('codeCenter.linearBarcode.print.sections.result.filters.failed')}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={resultFilter === 'skipped' ? 'default' : 'outline'}
          onClick={() => onResultFilterChange('skipped')}
          className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'
        >
          {t('codeCenter.linearBarcode.print.sections.result.filters.skipped')}
        </Button>
      </div>
      <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-5'>
        <div className='rounded-lg border border-dashed bg-background/80 px-3 py-2'>
          <div className='text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50'>
            {t('codeCenter.linearBarcode.print.sections.result.summary.totalLines')}
          </div>
          <div className='text-sm font-black text-foreground'>{batchPrintResult.totalLines}</div>
        </div>
        <div className='rounded-lg border border-dashed bg-background/80 px-3 py-2'>
          <div className='text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50'>
            {t('codeCenter.linearBarcode.print.sections.result.summary.printableLines')}
          </div>
          <div className='text-sm font-black text-foreground'>{batchPrintResult.printableLines}</div>
        </div>
        <div className='rounded-lg border border-dashed bg-emerald-50/70 px-3 py-2'>
          <div className='text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700/60'>
            {t('codeCenter.linearBarcode.print.sections.result.summary.successCount')}
          </div>
          <div className='text-sm font-black text-emerald-700'>{batchPrintResult.successCount}</div>
        </div>
        <div className='rounded-lg border border-dashed bg-rose-50/70 px-3 py-2'>
          <div className='text-[9px] font-black uppercase tracking-[0.18em] text-rose-700/60'>
            {t('codeCenter.linearBarcode.print.sections.result.summary.failureCount')}
          </div>
          <div className='text-sm font-black text-rose-700'>{batchPrintResult.failureCount}</div>
        </div>
        <div className='rounded-lg border border-dashed bg-amber-50/70 px-3 py-2'>
          <div className='text-[9px] font-black uppercase tracking-[0.18em] text-amber-700/60'>
            {t('codeCenter.linearBarcode.print.sections.result.summary.skippedCount')}
          </div>
          <div className='text-sm font-black text-amber-700'>{batchPrintResult.skippedCount}</div>
        </div>
      </div>
      <div className='space-y-2'>
        {filteredResultItems.length === 0 ? (
          <div className='rounded-lg border border-dashed bg-background/80 px-3 py-3 text-[10px] text-muted-foreground'>
            {t('codeCenter.linearBarcode.print.sections.result.states.emptyFiltered')}
          </div>
        ) : filteredResultItems.map((item) => (
          <div key={`${item.key}-result`} className='rounded-lg border border-dashed bg-background/80 px-3 py-2'>
            <div className='mb-2 flex items-start justify-between gap-3'>
              <div>
                <div className='text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/50'>
                  {t('codeCenter.linearBarcode.print.sections.result.fields.lineNo')} #{item.lineNo}
                </div>
                <div className='text-[11px] font-black text-foreground'>{item.productLabel}</div>
              </div>
              <div className='flex flex-col items-end gap-2'>
                <Badge className={
                  item.status === 'success'
                    ? 'border-none bg-emerald-500/10 text-emerald-700'
                    : item.status === 'failed'
                      ? 'border-none bg-rose-500/10 text-rose-700'
                      : 'border-none bg-amber-500/10 text-amber-700'
                }>
                  {item.status === 'success'
                    ? t('codeCenter.linearBarcode.print.sections.result.status.success')
                    : item.status === 'failed'
                      ? t('codeCenter.linearBarcode.print.sections.result.status.failed')
                      : t('codeCenter.linearBarcode.print.sections.result.status.skipped')}
                </Badge>
                {item.status === 'failed' && (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => void onRetryItem(item.key)}
                    disabled={Boolean(retryingKeys[item.key])}
                    className='h-7 rounded-full px-3 text-[9px] font-black uppercase tracking-[0.18em]'
                  >
                    {retryingKeys[item.key]
                      ? t('codeCenter.linearBarcode.print.sections.result.actions.retryingItem')
                      : t('codeCenter.linearBarcode.print.sections.result.actions.retryItem')}
                  </Button>
                )}
              </div>
            </div>
            <div className='grid gap-1 text-[10px] text-muted-foreground'>
              <div>{t('codeCenter.linearBarcode.print.sections.result.fields.message')}: {item.message}</div>
              <div>{t('codeCenter.linearBarcode.print.sections.result.fields.serial')}: {item.serial}</div>
              <div>{t('codeCenter.linearBarcode.print.sections.result.fields.barcodeSerial')}: {item.barcodeSerial}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
