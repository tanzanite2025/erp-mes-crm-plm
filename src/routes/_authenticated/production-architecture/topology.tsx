import { createFileRoute } from '@tanstack/react-router'
import { TopologyTemplate } from '@/features/production-shared/tabs/topology-template'

export const Route = createFileRoute('/_authenticated/production-architecture/topology')({
  component: () => <TopologyTemplate />,
})
