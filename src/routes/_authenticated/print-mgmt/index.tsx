import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/print-mgmt/')({
  beforeLoad: () => {
    throw redirect({ to: '/print-mgmt/barcode', replace: true })
  },
})
