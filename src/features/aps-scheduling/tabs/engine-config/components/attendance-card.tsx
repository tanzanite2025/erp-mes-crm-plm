import { UserCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type {
  GreedyEngineFactorBadgeItem,
  GreedyEngineFactorSummaryItem,
} from '../types'
import { FactorCard } from './factor-card'

type AttendanceCardProps = {
  badges: GreedyEngineFactorBadgeItem[]
  summaryItems: GreedyEngineFactorSummaryItem[]
}

export function AttendanceCard({ badges, summaryItems }: AttendanceCardProps) {
  const { t } = useLanguage()

  return (
    <FactorCard
      icon={UserCheck}
      title={t('apsScheduling.engineConfig.attendanceCard.title')}
      description={t('apsScheduling.engineConfig.attendanceCard.description')}
      badges={badges}
      summaryItems={summaryItems}
      accentClassName='text-emerald-600'
    />
  )
}
