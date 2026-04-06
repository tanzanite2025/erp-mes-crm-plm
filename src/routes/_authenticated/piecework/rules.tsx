import { createFileRoute } from '@tanstack/react-router'
import { PieceworkRules } from '@/features/piecework/tabs'

export const Route = createFileRoute('/_authenticated/piecework/rules')({
  component: PieceworkRules,
})
