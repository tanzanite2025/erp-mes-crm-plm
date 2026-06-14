import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/materials/')({
  beforeLoad: () => {
    throw redirect({
      to: '/materials/$category',
      params: { category: 'all' },
    })
  },
})
