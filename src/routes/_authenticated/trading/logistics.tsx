import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  search: z.string().optional(),
  bindOrderNo: z.string().optional(),
  bindShipmentId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/trading/logistics')({
  validateSearch: (search) => searchSchema.parse(search),
})
