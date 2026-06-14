import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

const searchSchema = z.object({
  search: z.string().optional(),
  bindOrderNo: z.string().optional(),
  bindShipmentId: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/shipping-management/logistics'
)({
  validateSearch: (search) => searchSchema.parse(search),
})
