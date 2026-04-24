import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/cutting-operations/')({
  beforeLoad: () => {
    throw redirect({ to: '/cutting-operations/cutting-issuance' })
  },
})
