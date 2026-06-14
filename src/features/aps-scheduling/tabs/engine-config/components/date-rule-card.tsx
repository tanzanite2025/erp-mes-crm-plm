import { CalendarDays } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type {
  GreedyEngineFactorBadgeItem,
  GreedyEngineFactorSummaryItem,
} from '../types'
import { FactorCard } from './factor-card'

type DateRuleCardProps = {
  badges: GreedyEngineFactorBadgeItem[]
  summaryItems: GreedyEngineFactorSummaryItem[]
}

export function DateRuleCard({ badges, summaryItems }: DateRuleCardProps) {
  const { t } = useLanguage()

  return (
    <FactorCard
      icon={CalendarDays}
      title={t('apsScheduling.engineConfig.dateCard.title')}
      description={t('apsScheduling.engineConfig.dateCard.description')}
      badges={badges}
      summaryItems={summaryItems}
    />
  )
}
