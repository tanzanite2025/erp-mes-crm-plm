import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'

const usersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(
      z.union([
        z.literal('active'),
        z.literal('inactive'),
        z.literal('invited'),
        z.literal('suspended'),
      ])
    )
    .optional()
    .catch([]),
  username: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/system-management/accounts')({
  validateSearch: usersSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/personnel/accounts',
      search,
      replace: true,
    })
  },
})
