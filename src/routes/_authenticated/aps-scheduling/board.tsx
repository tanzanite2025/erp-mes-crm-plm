import { createFileRoute } from '@tanstack/react-router'
import { ApsSchedulingBoard } from '@/features/aps-scheduling/tabs'

export const Route = createFileRoute('/_authenticated/aps-scheduling/board')({
  component: ApsSchedulingBoard,
})
