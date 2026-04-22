import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/print-mgmt/barcode')({
  beforeLoad: () => {
    throw redirect({ to: '/print-mgmt/records', replace: true })
  },
})
