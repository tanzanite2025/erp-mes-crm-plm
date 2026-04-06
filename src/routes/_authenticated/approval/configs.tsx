import { createFileRoute } from '@tanstack/react-router'
import { ApprovalConfigs } from '@/features/approval/tabs/approval-configs'

export const Route = createFileRoute('/_authenticated/approval/configs')({
  component: () => (
      <ApprovalConfigs />
  ),
})
