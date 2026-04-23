import { CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import type { GreedyEngineDateRuleSummaryItem } from '../types'
import { ENGINE_CARD_SHELL_CLASS, ENGINE_CARD_TITLE_CLASS, ENGINE_DESC_CLASS, ENGINE_KICKER_CLASS, ENGINE_PANEL_CLASS } from '../ui-classes'

type DateRuleCardProps = {
  summaryItems: GreedyEngineDateRuleSummaryItem[]
}

export function DateRuleCard({ summaryItems }: DateRuleCardProps) {
  const { t } = useLanguage()

  return (
    <Card className={`${ENGINE_CARD_SHELL_CLASS} bg-muted/5`}>
      <CardHeader className='gap-3 pb-3'>
        <div className='space-y-2'>
          <div className='flex items-center gap-3 text-cyan-700'>
            <div className='flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-background'>
              <CalendarDays className='size-5' />
            </div>
            <div>
              <CardTitle className={ENGINE_CARD_TITLE_CLASS}>{t('apsScheduling.engineConfig.dateCard.title')}</CardTitle>
              <CardDescription className={ENGINE_DESC_CLASS}>{t('apsScheduling.engineConfig.dateCard.description')}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='grid gap-2 md:grid-cols-3'>
          {summaryItems.map((item) => (
            <div key={item.id} className={`${ENGINE_PANEL_CLASS} bg-background p-3`}>
              <div className={ENGINE_KICKER_CLASS}>
                {t(item.labelKey)}
              </div>
              <div className='mt-1 text-sm font-black tracking-tight text-foreground'>
                {t(item.valueKey)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
