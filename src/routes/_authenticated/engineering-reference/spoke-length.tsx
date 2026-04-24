import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SpokeLengthTab } from '@/features/engineering-db/tabs/spoke-length-tab'

const spokeLengthSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/engineering-reference/spoke-length')({
  component: SpokeLengthTab,
  validateSearch: (search) => spokeLengthSearchSchema.parse(search),
})
