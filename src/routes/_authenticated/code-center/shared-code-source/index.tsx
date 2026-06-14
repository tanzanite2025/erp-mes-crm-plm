import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/code-center/shared-code-source/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/code-center/shared-code-source/hole-codes',
      replace: true,
    })
  },
})
