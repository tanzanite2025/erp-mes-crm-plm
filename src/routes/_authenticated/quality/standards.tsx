import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { StandardsIndexRouteEntry } from '@/features/quality/pages/standards-index-route-entry'

const qualityStandardsSearchSchema = z.object({
  keyword: z.string().optional().catch(''),
  type: z.enum(['ALL', 'IQC', 'IPQC', 'FQC', 'OQC']).optional().catch('ALL'),
  status: z
    .enum(['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'])
    .optional()
    .catch('ALL'),
  page: z.coerce.number().int().min(1).optional().catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(20),
})

export const Route = createFileRoute('/_authenticated/quality/standards')({
  validateSearch: qualityStandardsSearchSchema,
  component: StandardsIndexRouteEntry,
})
