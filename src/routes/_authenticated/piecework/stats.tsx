import { createFileRoute } from '@tanstack/react-router'
import { PieceworkStats } from '@/features/piecework/tabs'

export const Route = createFileRoute('/_authenticated/piecework/stats')({
  component: PieceworkStats,
})
