import { BrainCircuit } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { ENGINE_BADGE_CLASS } from '../ui-classes'

export function EngineOverviewCard() {
  const { t } = useLanguage()

  return (
    <IndustrialHeader
      icon={BrainCircuit}
      title={t('apsScheduling.engineConfig.title')}
      description={t('apsScheduling.engineConfig.subtitle')}
      gradient
      statusBadge={
        <div className={`${ENGINE_BADGE_CLASS} border-cyan-500/20 bg-cyan-500/5 text-cyan-700`}>
          {t('apsScheduling.engineConfig.sections.factorDeckTitle')}
        </div>
      }
    />
  )
}
