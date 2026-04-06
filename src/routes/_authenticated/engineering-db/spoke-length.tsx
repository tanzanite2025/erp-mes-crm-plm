import { createFileRoute } from '@tanstack/react-router'
import { SpokeLengthTab } from '@/features/engineering-db/tabs/spoke-length-tab'
import { z } from 'zod'

const spokeLengthSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/engineering-db/spoke-length')({
  component: SpokeLengthTab,
  validateSearch: (search) => spokeLengthSearchSchema.parse(search),
})
