import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

const searchSchema = z.object({
  viewId: z.string().optional(),
  mode: z.enum(['scan']).optional(),
})

export const Route = createFileRoute('/_authenticated/warehouse/shipment')({
  validateSearch: (search) => searchSchema.parse(search),
})
