import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/code-center/')({
  beforeLoad: () => {
    throw redirect({ to: '/code-center/linear-barcode/protocol', replace: true })
  },
})
