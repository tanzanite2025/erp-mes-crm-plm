import { createLazyFileRoute } from '@tanstack/react-router'
import { Purchase } from '@/features/purchase'

export const Route = createLazyFileRoute('/_authenticated/purchase')({
  component: Purchase,
})
