import { createFileRoute } from '@tanstack/react-router'
import { ApsScheduling } from '@/features/aps-scheduling'

export const Route = createFileRoute('/_authenticated/aps-scheduling')({
  component: ApsScheduling,
})
