import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  type LinearBarcodeStatusDefinition,
  type LinearBarcodeStatusDefinitionTone,
} from '@/features/code-center/data/linear-barcode-status-definitions'

function resolveLinearBarcodeStatusDefinitionBadgeClassName(
  tone: LinearBarcodeStatusDefinitionTone
): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-500/10 text-emerald-700'
    case 'info':
      return 'bg-sky-500/10 text-sky-700'
    case 'warning':
      return 'bg-amber-500/10 text-amber-700'
    case 'danger':
      return 'bg-rose-500/10 text-rose-700'
    case 'accent':
      return 'bg-orange-500/10 text-orange-700'
    case 'neutral':
      return 'bg-muted text-muted-foreground'
  }
}

export function LinearBarcodeStatusDefinitionCard({
  definition,
}: {
  definition: LinearBarcodeStatusDefinition
}) {
  const { t } = useLanguage()

  return (
    <div className='rounded-3xl border border-dashed border-muted/50 bg-background/70 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <Badge
            className={`border-none font-mono ${resolveLinearBarcodeStatusDefinitionBadgeClassName(
              definition.tone
            )}`}
          >
            {definition.code}
          </Badge>
          <div className='mt-3 text-sm font-black text-foreground'>
            {t(definition.labelKey)}
          </div>
        </div>
        <Badge className='border-none bg-primary/10 text-primary'>
          {definition.isTerminal
            ? t('codeCenter.linearBarcode.status.fields.terminalYes')
            : t('codeCenter.linearBarcode.status.fields.terminalNo')}
        </Badge>
      </div>
      <p className='mt-3 text-[11px] leading-5 text-muted-foreground'>
        {t(definition.descriptionKey)}
      </p>
      <div className='mt-4 grid gap-2 text-[11px] sm:grid-cols-2'>
        <div className='rounded-2xl bg-muted/20 px-3 py-2'>
          <div className='font-black text-muted-foreground/60'>
            {t('codeCenter.linearBarcode.status.fields.phase')}
          </div>
          <div className='mt-1 font-bold text-foreground'>
            {t(definition.phaseKey)}
          </div>
        </div>
        <div className='rounded-2xl bg-muted/20 px-3 py-2'>
          <div className='font-black text-muted-foreground/60'>
            {t('codeCenter.linearBarcode.status.fields.trigger')}
          </div>
          <div className='mt-1 font-bold text-foreground'>
            {t(definition.triggerKey)}
          </div>
        </div>
        <div className='rounded-2xl bg-muted/20 px-3 py-2 sm:col-span-2'>
          <div className='font-black text-muted-foreground/60'>
            {t('codeCenter.linearBarcode.status.fields.sourceTable')}
          </div>
          <div className='mt-1 font-mono font-bold text-foreground'>
            {definition.sourceTable}
          </div>
        </div>
      </div>
    </div>
  )
}
