import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/engineering/bom')({
  beforeLoad: () => {
    throw redirect({ to: '/product-structure/bom', replace: true })
  },
})
