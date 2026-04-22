import { createFileRoute } from '@tanstack/react-router'
import { SharedHoleCodeSourceMgmt } from '@/features/code-center/shared-hole-code-source-mgmt'

export const Route = createFileRoute('/_authenticated/code-center/shared-code-source/hole-codes')({
  component: SharedHoleCodeSourceMgmt,
})
