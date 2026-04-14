import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  autoEdit: z.preprocess((value) => {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    return undefined
  }, z.boolean().optional()),
  draftId: z.string().min(1).optional(),
  mode: z.enum(['photo', 'video']).optional(),
})

export const Route = createFileRoute('/_authenticated/personal-workbench/capture')({
  validateSearch: (search) => searchSchema.parse(search),
})
