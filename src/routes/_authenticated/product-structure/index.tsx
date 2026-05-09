import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/product-structure/')({
  beforeLoad: () => {
    throw redirect({ to: '/product-structure/bom', replace: true })
  },
})
