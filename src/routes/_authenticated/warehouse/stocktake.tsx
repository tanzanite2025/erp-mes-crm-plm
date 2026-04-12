import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  mode: z.enum(['scan']).optional(),
})

export const Route = createFileRoute('/_authenticated/warehouse/stocktake')({
  validateSearch: (search) => searchSchema.parse(search),
})
