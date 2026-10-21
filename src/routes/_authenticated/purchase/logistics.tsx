import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

const searchSchema = z.object({ logisticsId: z.string().uuid().optional() })

export const Route = createFileRoute('/_authenticated/purchase/logistics')({
  validateSearch: (search) => searchSchema.parse(search),
})
