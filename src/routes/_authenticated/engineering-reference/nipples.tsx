import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { NipplesTab } from '@/features/engineering-db/tabs/nipples-tab'

const nipplesSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/engineering-reference/nipples'
)({
  component: NipplesTab,
  validateSearch: (search) => nipplesSearchSchema.parse(search),
})
