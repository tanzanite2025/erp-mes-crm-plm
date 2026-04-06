import { createFileRoute } from '@tanstack/react-router'
import { NipplesTab } from '@/features/engineering-db/tabs/nipples-tab'
import { z } from 'zod'

const nipplesSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/engineering-db/nipples')({
  component: NipplesTab,
  validateSearch: (search) => nipplesSearchSchema.parse(search),
})
