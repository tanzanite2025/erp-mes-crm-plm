import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/warehouse/production-material-handovers'
)({
  validateSearch: z.object({
    documentId: z
      .uuid()
      .refine((value) => value === value.toLowerCase())
      .optional()
      .catch(undefined),
  }),
})
