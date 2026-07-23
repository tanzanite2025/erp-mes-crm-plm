import { BarChart3, Factory, ShieldCheck, Users } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'

export function BusinessAnalysisOverviewTab() {
  const { t } = useLanguage()

  const sections = [
    {
      icon: Factory,
      title: t('businessAnalysis.overview.productionTitle'),
      description: t('businessAnalysis.overview.productionDescription'),
      className: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: ShieldCheck,
      title: t('businessAnalysis.overview.qualityTitle'),
      description: t('businessAnalysis.overview.qualityDescription'),
      className: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    },
    {
      icon: Users,
      title: t('businessAnalysis.overview.customerTitle'),
      description: t('businessAnalysis.overview.customerDescription'),
      className: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    },
  ]

  return (
    <div className='flex animate-in flex-col gap-4 duration-500 fade-in'>
      <IndustrialHeader
        icon={BarChart3}
        title={t('businessAnalysis.overview.title')}
        description={t('businessAnalysis.overview.description')}
        gradient
      />

      <div className='grid gap-3 lg:grid-cols-3'>
        {sections.map(({ icon: Icon, title, description, className }) => (
          <Card
            key={title}
            className='rounded-[24px] border border-dashed border-muted/50 bg-background shadow-none'
          >
            <CardHeader className='p-4 pb-2'>
              <div
                className={`flex size-10 items-center justify-center rounded-2xl border ${className}`}
              >
                <Icon className='size-4' />
              </div>
              <CardTitle className='pt-2 text-sm font-black tracking-tight'>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-4 text-xs leading-relaxed text-muted-foreground'>
              {description}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='rounded-[24px] border border-dashed border-cyan-500/20 bg-cyan-500/5 shadow-none'>
        <CardContent className='space-y-1 p-4'>
          <p className='text-xs font-black tracking-wide text-cyan-700'>
            {t('businessAnalysis.overview.nextStepTitle')}
          </p>
          <p className='text-xs leading-relaxed text-cyan-800/75'>
            {t('businessAnalysis.overview.nextStepDescription')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
