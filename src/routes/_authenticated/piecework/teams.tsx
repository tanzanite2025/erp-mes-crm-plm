import { createFileRoute } from '@tanstack/react-router'
import { Teams } from '@/features/piecework/tabs/teams'

export const Route = createFileRoute('/_authenticated/piecework/teams')({
  component: Teams,
})
