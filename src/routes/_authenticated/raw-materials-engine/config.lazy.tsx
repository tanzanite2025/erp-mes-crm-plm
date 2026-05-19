import { createLazyFileRoute } from '@tanstack/react-router'
import { CuttingEngineConfigPage } from '@/features/raw-materials/engine-config/engine-config-page'

export const Route = createLazyFileRoute('/_authenticated/raw-materials-engine/config')({
  component: CuttingEngineConfigPage,
})
