import { createFileRoute } from '@tanstack/react-router'
import { HubsTab } from '@/features/engineering-db/tabs/hubs-tab'
import { z } from 'zod'

const hubsSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/engineering-db/hubs')({
  component: HubsTab,
  validateSearch: (search) => hubsSearchSchema.parse(search),
})
