import {
  Activity,
  Database,
  FileClock,
  Layers3,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  countTerminalLinearBarcodeStatusDefinitions,
  LINEAR_BARCODE_INVENTORY_STATUS_DEFINITIONS,
  LINEAR_BARCODE_PRODUCTION_STATE_DEFINITIONS,
  LINEAR_BARCODE_STATUS_DEFINITIONS,
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

function LinearBarcodeStatusDefinitionMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className='rounded-3xl border border-dashed border-muted/50 bg-background/70 px-4 py-3'>
      <div className='text-[10px] font-black tracking-[0.18em] text-muted-foreground/60 uppercase'>
        {label}
      </div>
      <div className='mt-1 text-lg font-black tracking-tight text-foreground'>
        {value}
      </div>
    </div>
  )
}

function LinearBarcodeStatusDefinitionCard({
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

function LinearBarcodeStatusDefinitionSection({
  title,
  description,
  icon: Icon,
  definitions,
}: {
  title: string
  description: string
  icon: LucideIcon
  definitions: readonly LinearBarcodeStatusDefinition[]
}) {
  return (
    <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
          <Icon className='size-4 text-primary' />
          {title}
        </CardTitle>
        <CardDescription className='text-[11px] leading-5'>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-3 lg:grid-cols-2'>
          {definitions.map((definition) => (
            <LinearBarcodeStatusDefinitionCard
              key={definition.code}
              definition={definition}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function LinearBarcodeStatusMgmt() {
  const { t } = useLanguage()
  const terminalStatusCount = countTerminalLinearBarcodeStatusDefinitions(
    LINEAR_BARCODE_STATUS_DEFINITIONS
  )

  return (
    <div className='flex animate-in flex-col gap-5 duration-500 fade-in'>
      <IndustrialHeader
        icon={Activity}
        title={t('codeCenter.linearBarcode.status.page.title')}
        description={t('codeCenter.linearBarcode.status.page.description')}
        statusBadge={
          <Badge className='border-none bg-primary/10 px-4 py-1.5 text-[10px] font-black tracking-[0.2em] text-primary uppercase'>
            {t('codeCenter.linearBarcode.status.page.badges.definitionOnly')}
          </Badge>
        }
      />

      <div className='grid gap-3 md:grid-cols-3'>
        <LinearBarcodeStatusDefinitionMetric
          label={t('codeCenter.linearBarcode.status.metrics.total')}
          value={LINEAR_BARCODE_STATUS_DEFINITIONS.length}
        />
        <LinearBarcodeStatusDefinitionMetric
          label={t('codeCenter.linearBarcode.status.metrics.inventory')}
          value={LINEAR_BARCODE_INVENTORY_STATUS_DEFINITIONS.length}
        />
        <LinearBarcodeStatusDefinitionMetric
          label={t('codeCenter.linearBarcode.status.metrics.terminal')}
          value={terminalStatusCount}
        />
      </div>

      <Card className='rounded-[28px] border border-dashed border-primary/20 bg-primary/5 shadow-none'>
        <CardContent className='flex flex-col gap-3 p-5 md:flex-row md:items-start'>
          <ShieldCheck className='size-5 shrink-0 text-primary' />
          <div>
            <div className='text-sm font-black text-foreground'>
              {t('codeCenter.linearBarcode.status.boundary.title')}
            </div>
            <p className='mt-2 text-[11px] leading-5 text-muted-foreground'>
              {t('codeCenter.linearBarcode.status.boundary.description')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-5 xl:grid-cols-2'>
        <LinearBarcodeStatusDefinitionSection
          icon={Database}
          title={t(
            'codeCenter.linearBarcode.status.categories.inventory.title'
          )}
          description={t(
            'codeCenter.linearBarcode.status.categories.inventory.description'
          )}
          definitions={LINEAR_BARCODE_INVENTORY_STATUS_DEFINITIONS}
        />
        <LinearBarcodeStatusDefinitionSection
          icon={Layers3}
          title={t(
            'codeCenter.linearBarcode.status.categories.production.title'
          )}
          description={t(
            'codeCenter.linearBarcode.status.categories.production.description'
          )}
          definitions={LINEAR_BARCODE_PRODUCTION_STATE_DEFINITIONS}
        />
      </div>

      <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
            <FileClock className='size-4 text-primary' />
            {t('codeCenter.linearBarcode.status.flow.title')}
          </CardTitle>
          <CardDescription className='text-[11px] leading-5'>
            {t('codeCenter.linearBarcode.status.flow.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-3 text-[11px] md:grid-cols-3'>
            <div className='rounded-3xl border border-dashed border-muted/50 bg-background/70 p-4'>
              <div className='font-black text-foreground'>
                {t('codeCenter.linearBarcode.status.flow.printStageTitle')}
              </div>
              <p className='mt-2 leading-5 text-muted-foreground'>
                {t(
                  'codeCenter.linearBarcode.status.flow.printStageDescription'
                )}
              </p>
            </div>
            <div className='rounded-3xl border border-dashed border-muted/50 bg-background/70 p-4'>
              <div className='font-black text-foreground'>
                {t('codeCenter.linearBarcode.status.flow.bindingStageTitle')}
              </div>
              <p className='mt-2 leading-5 text-muted-foreground'>
                {t(
                  'codeCenter.linearBarcode.status.flow.bindingStageDescription'
                )}
              </p>
            </div>
            <div className='rounded-3xl border border-dashed border-muted/50 bg-background/70 p-4'>
              <div className='font-black text-foreground'>
                {t('codeCenter.linearBarcode.status.flow.executionStageTitle')}
              </div>
              <p className='mt-2 leading-5 text-muted-foreground'>
                {t(
                  'codeCenter.linearBarcode.status.flow.executionStageDescription'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
