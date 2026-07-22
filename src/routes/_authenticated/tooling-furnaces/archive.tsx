import { createFileRoute } from '@tanstack/react-router'
import { FurnaceArchivePage } from '@/features/tooling-furnaces/pages/furnace-archive-page'

export const Route = createFileRoute(
  '/_authenticated/tooling-furnaces/archive'
)({
  component: FurnaceArchivePage,
})
