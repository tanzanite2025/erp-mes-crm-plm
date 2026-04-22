import { createFileRoute } from '@tanstack/react-router'
import { DmCodeLayout } from '@/features/code-center/dm-code-layout'

export const Route = createFileRoute('/_authenticated/code-center/dm-code')({
  component: DmCodeLayout,
})
