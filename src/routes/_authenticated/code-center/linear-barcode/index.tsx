import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/code-center/linear-barcode/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/code-center/linear-barcode/protocol',
      replace: true,
    })
  },
})
