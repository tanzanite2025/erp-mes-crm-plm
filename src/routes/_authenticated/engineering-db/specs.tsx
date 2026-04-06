import { createFileRoute } from '@tanstack/react-router'
import { SpecsTab } from '@/features/engineering-db/tabs/specs-tab'
import { z } from 'zod'

const specsSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/engineering-db/specs')({
  component: SpecsTab,
  validateSearch: (search) => specsSearchSchema.parse(search),
})
