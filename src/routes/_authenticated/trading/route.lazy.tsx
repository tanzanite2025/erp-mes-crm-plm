import { createLazyFileRoute } from '@tanstack/react-router'
import { Trading } from '@/features/trading'

export const Route = createLazyFileRoute('/_authenticated/trading')({
  component: Trading,
})
