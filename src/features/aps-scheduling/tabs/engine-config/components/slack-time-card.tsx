import { CalendarClock } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type {
  GreedyEngineFactorBadgeItem,
  GreedyEngineFactorSummaryItem,
} from '../types'
import { FactorCard } from './factor-card'

type SlackTimeCardProps = {
  badges: GreedyEngineFactorBadgeItem[]
  summaryItems: GreedyEngineFactorSummaryItem[]
}

export function SlackTimeCard({ badges, summaryItems }: SlackTimeCardProps) {
  const { t } = useLanguage()

  return (
    <FactorCard
      icon={CalendarClock}
      title={t('apsScheduling.engineConfig.slackTimeCard.title')}
      description={t('apsScheduling.engineConfig.slackTimeCard.description')}
      badges={badges}
      summaryItems={summaryItems}
      accentClassName='text-indigo-600'
    />
  )
}
