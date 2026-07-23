import { Factory, Filter, Gauge } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'

const METRIC_KEYS = [
  'plannedQuantity',
  'completedQuantity',
  'qualifiedQuantity',
  'scrapQuantity',
] as const

export function ProductionCapacityAnalysisTab() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-4 duration-500 fade-in'>
      <IndustrialHeader
        icon={Factory}
        title={t('businessAnalysis.productionCapacity.title')}
        description={t('businessAnalysis.productionCapacity.description')}
        gradient
      />

      <Card className='rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'>
        <CardHeader className='p-4 pb-2'>
          <CardTitle className='flex items-center gap-2 text-xs font-black tracking-widest text-muted-foreground uppercase'>
            <Filter className='size-3.5 text-primary' />
            {t('businessAnalysis.productionCapacity.filtersTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className='px-4 pb-4'>
          <div className='rounded-xl border border-dashed border-muted/50 bg-muted/5 px-3 py-2 text-xs text-muted-foreground'>
            {t('businessAnalysis.productionCapacity.filters')}
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {METRIC_KEYS.map((key) => (
          <Card
            key={key}
            className='rounded-[20px] border border-dashed border-muted/50 bg-muted/5 shadow-none'
          >
            <CardContent className='flex items-center justify-between gap-3 p-4'>
              <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t(`businessAnalysis.productionCapacity.${key}`)}
              </span>
              <span className='font-mono text-xl font-black text-muted-foreground/40'>
                —
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='rounded-[24px] border border-dashed border-amber-500/20 bg-amber-500/5 shadow-none'>
        <CardContent className='space-y-2 p-4'>
          <div className='flex items-center gap-2 text-amber-700'>
            <Gauge className='size-4' />
            <p className='text-xs font-black tracking-wide'>
              {t('businessAnalysis.productionCapacity.status')}
            </p>
          </div>
          <p className='text-xs leading-relaxed text-amber-800/75'>
            {t('businessAnalysis.productionCapacity.statusDescription')}
          </p>
        </CardContent>
      </Card>

      <Card className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
        <CardHeader className='p-4 pb-2'>
          <CardTitle className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
            {t('businessAnalysis.productionCapacity.sourceTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className='px-4 pb-4 text-xs leading-relaxed text-muted-foreground'>
          {t('businessAnalysis.productionCapacity.sourceDescription')}
        </CardContent>
      </Card>
    </div>
  )
}
