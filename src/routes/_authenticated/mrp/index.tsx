import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/mrp/')({
  beforeLoad: () => {
    throw redirect({
      to: '/mrp/requirements',
      replace: true,
    })
  },
})
