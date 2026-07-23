import { createLazyFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { AnalysisPlaceholder } from '@/features/business-analysis/components/analysis-placeholder'

function CustomerAnalysisTab() {
  const { t } = useLanguage()
  return (
    <AnalysisPlaceholder
      icon={Users}
      title={t('businessAnalysis.tabs.customers')}
    />
  )
}

export const Route = createLazyFileRoute(
  '/_authenticated/business-analysis/customers'
)({
  component: CustomerAnalysisTab,
})
