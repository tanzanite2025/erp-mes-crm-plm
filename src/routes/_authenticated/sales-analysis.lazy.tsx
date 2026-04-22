import { createLazyFileRoute } from '@tanstack/react-router'
import { SalesAnalysisModule } from '@/features/trading/sales-analysis'

export const Route = createLazyFileRoute('/_authenticated/sales-analysis')({
  component: SalesAnalysisModule,
})
