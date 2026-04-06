import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/terminal-config/')({
  beforeLoad: () => {
    throw redirect({ to: '/terminal-config/printers', replace: true })
  },
})
