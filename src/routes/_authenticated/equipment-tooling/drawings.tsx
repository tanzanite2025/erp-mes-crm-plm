import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DrawingsRouteEntry } from '@/features/equipment-tooling/pages/drawings-route-entry'

const drawingsSearchSchema = z.object({
  action: z.enum(['import']).optional(),
})

export const Route = createFileRoute(
  '/_authenticated/equipment-tooling/drawings'
)({
  validateSearch: (search) => drawingsSearchSchema.parse(search),
  component: DrawingsRouteEntry,
})
