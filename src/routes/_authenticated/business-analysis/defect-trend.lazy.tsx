import { createLazyFileRoute } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { AnalysisPlaceholder } from '@/features/business-analysis/components/analysis-placeholder'

function DefectTrendAnalysisTab() {
  const { t } = useLanguage()
  return (
    <AnalysisPlaceholder
      icon={ShieldCheck}
      title={t('businessAnalysis.tabs.defectTrend')}
    />
  )
}

export const Route = createLazyFileRoute(
  '/_authenticated/business-analysis/defect-trend'
)({
  component: DefectTrendAnalysisTab,
})
