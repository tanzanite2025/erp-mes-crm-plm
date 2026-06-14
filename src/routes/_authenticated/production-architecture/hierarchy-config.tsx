import { createFileRoute } from '@tanstack/react-router'
import { HierarchyConfig } from '@/features/production-shared/tabs/hierarchy-config'

export const Route = createFileRoute(
  '/_authenticated/production-architecture/hierarchy-config'
)({
  component: () => <HierarchyConfig />,
})
