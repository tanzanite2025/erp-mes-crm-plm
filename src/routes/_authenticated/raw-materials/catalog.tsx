import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  bindToken: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/raw-materials/catalog')({
  validateSearch: searchSchema,
})
