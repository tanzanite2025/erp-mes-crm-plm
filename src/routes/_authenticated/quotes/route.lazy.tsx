import { createLazyFileRoute } from '@tanstack/react-router'
import { Quotes } from '@/features/quotes'

export const Route = createLazyFileRoute('/_authenticated/quotes')({
  component: Quotes,
})
