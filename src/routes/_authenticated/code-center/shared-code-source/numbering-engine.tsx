import { createFileRoute } from '@tanstack/react-router'
import { SharedNumberingEngineMgmt } from '@/features/code-center/shared-numbering-engine-mgmt'

export const Route = createFileRoute(
  '/_authenticated/code-center/shared-code-source/numbering-engine'
)({
  component: SharedNumberingEngineMgmt,
})
