import { createFileRoute } from '@tanstack/react-router'
import { SettlementsPage } from '@/features/finance/pages/settlements-page'

export const Route = createFileRoute('/_authenticated/finance-settlements')({
  component: SettlementsPage,
})
