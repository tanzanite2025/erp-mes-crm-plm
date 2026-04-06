import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/engineering/')({
  beforeLoad: () => {
    throw redirect({
      to: '/engineering/products',
      replace: true,
    })
  },
})
