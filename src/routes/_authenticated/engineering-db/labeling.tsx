import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { LabelingTab } from '@/features/engineering-db/tabs/labeling-tab'

const labelingSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/engineering-db/labeling')(
  {
    component: LabelingTab,
    validateSearch: (search) => labelingSearchSchema.parse(search),
  }
)
