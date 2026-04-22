import { createFileRoute } from '@tanstack/react-router'
import { EngineeringMasterWeavingModeTab } from '@/features/engineering-db/tabs/engineering-master-weaving-mode-tab'

export const Route = createFileRoute('/_authenticated/engineering-db/engineering-master/weaving-mode')({
  component: EngineeringMasterWeavingModeTab,
})
