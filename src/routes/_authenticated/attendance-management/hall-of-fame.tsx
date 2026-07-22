import { createFileRoute } from '@tanstack/react-router'
import { HallOfFameRoutePage } from '@/features/org-personnel/components/hall-of-fame-route-page'

export const Route = createFileRoute(
  '/_authenticated/attendance-management/hall-of-fame'
)({
  component: HallOfFameRoutePage,
})
