import { createLazyFileRoute } from '@tanstack/react-router'
import { Gauge } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { AnalysisPlaceholder } from '@/features/business-analysis/components/analysis-placeholder'

function ProductionEfficiencyAnalysisTab() {
  const { t } = useLanguage()
  return (
    <AnalysisPlaceholder
      icon={Gauge}
      title={t('businessAnalysis.tabs.productionEfficiency')}
    />
  )
}

export const Route = createLazyFileRoute(
  '/_authenticated/business-analysis/production-efficiency'
)({
  component: ProductionEfficiencyAnalysisTab,
})
