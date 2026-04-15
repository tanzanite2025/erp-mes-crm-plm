import { createFileRoute } from '@tanstack/react-router'
import { AuditEngineTab } from '../../../features/audit-engine/components/audit-engine-tab'

export const Route = createFileRoute('/_authenticated/system-management/audit-engine')({
  component: AuditEngineTab,
})
