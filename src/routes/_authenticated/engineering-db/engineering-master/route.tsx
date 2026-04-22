import { createFileRoute } from '@tanstack/react-router'
import { EngineeringMasterLayout } from '@/features/engineering-db/engineering-master-layout'

export const Route = createFileRoute('/_authenticated/engineering-db/engineering-master')({
  component: EngineeringMasterLayout,
})
