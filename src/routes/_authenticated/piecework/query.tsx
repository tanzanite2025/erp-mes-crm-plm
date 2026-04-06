import { createFileRoute } from '@tanstack/react-router'
import { PieceworkQuery } from '@/features/piecework/tabs'

export const Route = createFileRoute('/_authenticated/piecework/query')({
  component: PieceworkQuery,
})
