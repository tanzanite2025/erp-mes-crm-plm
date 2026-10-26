import { createFileRoute } from '@tanstack/react-router'
import { ApprovalRequests } from '@/features/approval/tabs/approval-requests'

export const Route = createFileRoute('/_authenticated/approval/requests')({
  validateSearch: (
    search: Record<string, unknown>
  ): { requestId?: string } => ({
    requestId:
      typeof search.requestId === 'string' ? search.requestId : undefined,
  }),
  component: () => <ApprovalRequests />,
})
