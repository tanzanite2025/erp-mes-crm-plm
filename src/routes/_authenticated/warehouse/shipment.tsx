import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  viewId: z.string().optional(),
  mode: z.enum(['scan']).optional(),
})

export const Route = createFileRoute('/_authenticated/warehouse/shipment')({
  validateSearch: (search) => searchSchema.parse(search),
})
