import { createFileRoute } from '@tanstack/react-router'
import { ApprovalHistory } from '@/features/approval/tabs/approval-history'

export const Route = createFileRoute('/_authenticated/approval/history')({
  component: () => (
      <ApprovalHistory />
  ),
})
