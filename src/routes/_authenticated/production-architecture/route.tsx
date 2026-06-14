import { createFileRoute } from '@tanstack/react-router'
import { ProductionArchitecture } from '@/features/production-architecture'

export const Route = createFileRoute('/_authenticated/production-architecture')(
  {
    component: ProductionArchitecture,
  }
)
