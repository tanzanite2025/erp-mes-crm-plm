import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DrillingTab } from '@/features/engineering-db/tabs/drilling-tab'

const drillingSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/engineering-db/drilling')(
  {
    component: DrillingTab,
    validateSearch: (search) => drillingSearchSchema.parse(search),
  }
)
