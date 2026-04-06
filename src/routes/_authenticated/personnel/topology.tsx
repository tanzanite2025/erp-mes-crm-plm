import { createFileRoute } from '@tanstack/react-router'
import { TopologyTemplate } from '@/features/production-shared/tabs/topology-template'

export const Route = createFileRoute('/_authenticated/personnel/topology')({
  component: () => <TopologyTemplate />,
})
