import { createLazyFileRoute } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { AnalysisPlaceholder } from '@/features/business-analysis/components/analysis-placeholder'

function ScrapAnalysisTab() {
  const { t } = useLanguage()
  return (
    <AnalysisPlaceholder
      icon={ShieldCheck}
      title={t('businessAnalysis.tabs.scrap')}
    />
  )
}

export const Route = createLazyFileRoute(
  '/_authenticated/business-analysis/scrap'
)({
  component: ScrapAnalysisTab,
})
