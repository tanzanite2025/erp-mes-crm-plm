import { createFileRoute } from '@tanstack/react-router'
import { ApprovalRequests } from '@/features/approval/tabs/approval-requests'

export const Route = createFileRoute('/_authenticated/approval/requests')({
  component: () => (
      <ApprovalRequests />
  ),
})
