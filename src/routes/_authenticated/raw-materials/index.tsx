import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/raw-materials/')({
  beforeLoad: () => {
    throw redirect({ to: '/raw-materials/catalog' })
  },
})
