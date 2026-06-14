import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeBaseRouteEntry } from '@/features/basic-settings/knowledge-base/pages/knowledge-base-route-entry'

const knowledgeBaseSearchSchema = z.object({
  action: z.enum(['create']).optional(),
})

export const Route = createFileRoute(
  '/_authenticated/basic-settings/knowledge-base'
)({
  validateSearch: (search) => knowledgeBaseSearchSchema.parse(search),
  component: KnowledgeBaseRouteEntry,
})
