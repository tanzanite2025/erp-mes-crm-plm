import { createLazyFileRoute } from '@tanstack/react-router'
import MaterialThresholdsTab from '@/features/warehouse-config/tabs/material-thresholds'

export const Route = createLazyFileRoute('/_authenticated/warehouse-config/material-thresholds')({
  component: MaterialThresholdsTab,
})
