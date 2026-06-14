import { createLazyFileRoute } from '@tanstack/react-router'
import { RawMaterialsEngineModule } from '@/features/raw-materials/engine-config/raw-materials-engine-module'

export const Route = createLazyFileRoute(
  '/_authenticated/raw-materials-engine'
)({
  component: RawMaterialsEngineModule,
})
