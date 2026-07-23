import type { LucideIcon } from 'lucide-react'
import { Clock3 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'

type AnalysisPlaceholderProps = {
  icon: LucideIcon
  title: string
}

export function AnalysisPlaceholder({
  icon: Icon,
  title,
}: AnalysisPlaceholderProps) {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-4 duration-500 fade-in'>
      <IndustrialHeader
        icon={Icon}
        title={title}
        description={t('businessAnalysis.placeholder.description')}
        gradient
      />
      <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
        <CardContent className='flex min-h-56 flex-col items-center justify-center gap-3 text-center'>
          <div className='flex size-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600'>
            <Clock3 className='size-5' />
          </div>
          <div className='space-y-1'>
            <p className='text-sm font-black tracking-tight text-foreground'>
              {t('businessAnalysis.placeholder.status')}
            </p>
            <p className='max-w-xl text-xs leading-relaxed text-muted-foreground'>
              {t('businessAnalysis.placeholder.description')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
