import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

const searchSchema = z.object({
  mode: z.enum(['scan']).optional(),
})

export const Route = createFileRoute('/_authenticated/warehouse/inbound')({
  validateSearch: (search) => searchSchema.parse(search),
})
