import { createLazyFileRoute } from '@tanstack/react-router'
import { BusinessAnalysisModule } from '@/features/business-analysis'

export const Route = createLazyFileRoute('/_authenticated/business-analysis')({
  component: BusinessAnalysisModule,
})
