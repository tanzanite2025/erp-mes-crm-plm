import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/engineering-db/engineering-master/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/engineering-db/engineering-master/weaving-mode',
      replace: true,
    })
  },
})
