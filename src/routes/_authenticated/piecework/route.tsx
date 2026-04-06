import { createFileRoute } from '@tanstack/react-router'
import { Piecework } from '@/features/piecework'

export const Route = createFileRoute('/_authenticated/piecework')({
  component: Piecework,
})
