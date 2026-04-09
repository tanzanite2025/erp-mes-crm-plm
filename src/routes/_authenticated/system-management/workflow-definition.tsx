import { createFileRoute } from '@tanstack/react-router'
import { SalesWorkflowDefinitionTab } from '@/features/system-mgmt/tabs/sales-workflow-definition-tab'

export const Route = createFileRoute('/_authenticated/system-management/workflow-definition')({
  component: SalesWorkflowDefinitionTab,
})

