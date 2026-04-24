import { Calendar, Database, Pencil, Plus, Ruler, Search, Waves } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { prepregSpecSummary, type PrepregMaterialSpec } from '../data/prepreg-material-spec-schema'

interface PrepregCatalogListProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onCreate: () => void
  specs: PrepregMaterialSpec[]
  isLoading: boolean
  onEdit: (spec: PrepregMaterialSpec) => void
}

export function PrepregCatalogList({
  searchTerm,
  onSearchTermChange,
  onCreate,
  specs,
  isLoading,
  onEdit,
}: PrepregCatalogListProps) {
  const { t } = useLanguage()
  const statusLabel = (status: PrepregMaterialSpec['status']) => {
    if (status === 'Active') return t('rawMaterials.catalog.status.active')
    if (status === 'Inactive') return t('rawMaterials.catalog.status.inactive')
    return t('rawMaterials.catalog.status.archived')
  }
  const activeCount = specs.filter((item) => item.status === 'Active').length
  const dimensionReadyCount = specs.filter(
    (item) => item.widthMm && item.nominalAreaM2
  ).length

  return (
    <>
      <section className='rounded-[28px] border border-dashed border-muted/60 bg-muted/10 p-5 shadow-inner'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-primary'>
              <Database className='size-5' />
              <h2 className='text-sm font-black italic tracking-tighter'>
                {t('rawMaterials.catalog.hero.title')}
              </h2>
            </div>
            <p className='max-w-4xl text-[10px] font-black uppercase tracking-widest leading-5 text-muted-foreground/60'>
              {t('rawMaterials.catalog.hero.description')}
            </p>
          </div>

          <div className='grid grid-cols-3 gap-2 text-center lg:min-w-[360px]'>
            <Metric
              label={t('rawMaterials.catalog.metrics.total')}
              value={specs.length}
            />
            <Metric
              label={t('rawMaterials.catalog.metrics.active')}
              value={activeCount}
            />
            <Metric
              label={t('rawMaterials.catalog.metrics.dimensionReady')}
              value={dimensionReadyCount}
            />
          </div>
        </div>

        <div className='mt-4 grid gap-2 md:grid-cols-4'>
          <FlowStep
            label={t('rawMaterials.catalog.flow.definition.label')}
            value={t('rawMaterials.catalog.flow.definition.value')}
          />
          <FlowStep
            label={t('rawMaterials.catalog.flow.dimension.label')}
            value={t('rawMaterials.catalog.flow.dimension.value')}
          />
          <FlowStep
            label={t('rawMaterials.catalog.flow.recognition.label')}
            value={t('rawMaterials.catalog.flow.recognition.value')}
          />
          <FlowStep
            label={t('rawMaterials.catalog.flow.scope.label')}
            value={t('rawMaterials.catalog.flow.scope.value')}
          />
        </div>
      </section>

      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='relative w-full md:max-w-md'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder={t('rawMaterials.catalog.searchPlaceholder')}
            className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-[10px] font-black tracking-[0.16em] shadow-inner placeholder:text-muted-foreground/45'
          />
        </div>
        <Button
          onClick={onCreate}
          className='h-11 rounded-full px-7 text-[10px] font-black uppercase tracking-widest'
        >
          <Plus className='size-4' />
          {t('rawMaterials.catalog.actions.create')}
        </Button>
      </div>

      <div className='overflow-hidden rounded-[28px] border border-dashed border-muted/60 bg-background shadow-sm'>
        <div className='hidden grid-cols-[1.2fr_1fr_1fr_1fr_100px] border-b border-dashed border-muted/60 bg-muted/25 px-5 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60 md:grid'>
          <span>{t('rawMaterials.catalog.table.columns.product')}</span>
          <span>{t('rawMaterials.catalog.table.columns.material')}</span>
          <span>{t('rawMaterials.catalog.table.columns.dimension')}</span>
          <span>{t('rawMaterials.catalog.table.columns.production')}</span>
          <span className='text-right'>
            {t('rawMaterials.catalog.table.columns.actions')}
          </span>
        </div>

        {isLoading ? (
          <div className='p-10 text-center text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/50'>
            {t('rawMaterials.catalog.loading')}
          </div>
        ) : specs.length === 0 ? (
          <div className='p-12 text-center'>
            <p className='text-[10px] font-black uppercase tracking-[0.24em] text-foreground/80'>
              {t('rawMaterials.catalog.empty.title')}
            </p>
            <p className='mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('rawMaterials.catalog.empty.description')}
            </p>
          </div>
        ) : (
          specs.map((spec) => (
            <button
              key={spec.id}
              type='button'
              onClick={() => onEdit(spec)}
              className='grid w-full gap-3 border-b border-dashed border-muted/50 px-5 py-4 text-left transition hover:bg-muted/20 md:grid-cols-[1.2fr_1fr_1fr_1fr_100px] md:items-center'
            >
              <div className='space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-mono text-[10px] font-black tracking-[0.2em] text-foreground/80'>
                    {spec.code}
                  </span>
                  <Badge className='rounded-full border-none bg-primary/10 text-[10px] font-mono uppercase tracking-widest text-primary'>
                    {statusLabel(spec.status)}
                  </Badge>
                </div>
                <div className='text-sm font-black italic tracking-tighter text-foreground/90'>
                  {spec.displayAlias || spec.name}
                </div>
                {spec.displayAlias ? (
                  <div className='text-[10px] font-semibold text-muted-foreground/80'>
                    {spec.name}
                  </div>
                ) : null}
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {prepregSpecSummary(spec) ||
                    t('rawMaterials.catalog.table.summaryEmpty')}
                </div>
              </div>
              <InfoCell
                icon={Waves}
                main={
                  spec.fiberModel ||
                  t('rawMaterials.catalog.table.fallback.fiberModel')
                }
                sub={
                  [
                    spec.resinContentPercent
                      ? `RC ${spec.resinContentPercent}%`
                      : '',
                  ].filter(Boolean).join(' / ') ||
                  t('rawMaterials.catalog.table.fallback.resin')
                }
              />
              <InfoCell
                icon={Ruler}
                main={
                  spec.widthMm
                    ? `${spec.widthMm} mm`
                    : t('rawMaterials.catalog.table.fallback.width')
                }
                sub={
                  [
                    spec.nominalAreaM2 ? `${spec.nominalAreaM2} m2` : '',
                    spec.lengthM ? `${t('rawMaterials.catalog.table.length')} ${spec.lengthM} m` : '',
                  ].filter(Boolean).join(' / ') ||
                  t('rawMaterials.catalog.table.fallback.area')
                }
              />
              <InfoCell
                icon={Calendar}
                main={
                  spec.productionDate ||
                  t('rawMaterials.catalog.table.fallback.productionDate')
                }
                sub={
                  [
                    spec.inspector
                      ? `${t('rawMaterials.catalog.table.inspector')} ${spec.inspector}`
                      : '',
                    spec.boxNo
                      ? `${t('rawMaterials.catalog.table.boxNo')} ${spec.boxNo}`
                      : '',
                  ].filter(Boolean).join(' / ') ||
                  t('rawMaterials.catalog.table.fallback.inspection')
                }
              />
              <div className='flex justify-end'>
                <span className='inline-flex size-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground'>
                  <Pencil className='size-4' />
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-2xl border border-dashed border-muted/60 bg-background/70 p-3'>
      <div className='text-base font-black tabular-nums tracking-tight text-foreground/90'>
        {value}
      </div>
      <div className='mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
        {label}
      </div>
    </div>
  )
}

function FlowStep({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-dashed border-muted/45 bg-background/70 p-3'>
      <div className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
        {label}
      </div>
      <div className='mt-2 text-[10px] font-black uppercase tracking-widest leading-5 text-foreground/75'>
        {value}
      </div>
    </div>
  )
}

function InfoCell({
  icon: Icon,
  main,
  sub,
}: {
  icon: typeof Calendar
  main: string
  sub: string
}) {
  return (
    <div className='flex items-start gap-2'>
      <Icon className='mt-0.5 size-4 shrink-0 text-primary/60' />
      <div className='min-w-0'>
        <div className='truncate text-[10px] font-black uppercase tracking-[0.16em] text-foreground/80'>
          {main}
        </div>
        <div className='truncate text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55'>
          {sub}
        </div>
      </div>
    </div>
  )
}
