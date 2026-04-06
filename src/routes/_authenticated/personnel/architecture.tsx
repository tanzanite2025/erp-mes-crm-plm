import { createFileRoute } from '@tanstack/react-router'
import { WorkArchitecture } from '@/features/production-shared/tabs/work-architecture'

export const Route = createFileRoute('/_authenticated/personnel/architecture')({
  component: () => <WorkArchitecture />,
})
