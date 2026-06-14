import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { HubsTab } from '@/features/engineering-db/tabs/hubs-tab'

const hubsSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/engineering-reference/hubs'
)({
  component: HubsTab,
  validateSearch: (search) => hubsSearchSchema.parse(search),
})
