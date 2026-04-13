import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  mode: z.enum(['photo', 'video']).optional(),
})

export const Route = createFileRoute('/_authenticated/personal-workbench/capture')({
  validateSearch: (search) => searchSchema.parse(search),
})
