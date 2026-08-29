import { createFileRoute } from '@tanstack/react-router'
import { PieceworkTemplates } from '@/features/piecework/tabs/templates'

export const Route = createFileRoute('/_authenticated/piecework/templates')({
  component: PieceworkTemplates,
})
