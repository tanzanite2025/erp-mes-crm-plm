import { createLazyFileRoute } from '@tanstack/react-router'
import { Gauge } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { AnalysisPlaceholder } from '@/features/business-analysis/components/analysis-placeholder'

function ProductionLoadAnalysisTab() {
  const { t } = useLanguage()
  return (
    <AnalysisPlaceholder
      icon={Gauge}
      title={t('businessAnalysis.tabs.productionLoad')}
    />
  )
}

export const Route = createLazyFileRoute(
  '/_authenticated/business-analysis/production-load'
)({
  component: ProductionLoadAnalysisTab,
})
