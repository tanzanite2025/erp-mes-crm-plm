import { createFileRoute } from '@tanstack/react-router'
import { ApsEngineTuningTab } from '@/features/aps-scheduling/tabs/engine-tuning'

export const Route = createFileRoute('/_authenticated/aps-scheduling/engine-tuning')({
  component: ApsEngineTuningTab,
})
