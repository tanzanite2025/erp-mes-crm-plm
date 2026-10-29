import { Route } from '@/routes/_authenticated/materials/route'
import { describe, expect, it, vi } from 'vitest'
import { PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH } from './production-material-creation-operation-guide-tab-config'
import { MaterialCoreService } from './services/material-core-service'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}))
vi.mock(
  '@/features/material-archive/components/materials-route-layout',
  () => ({ MaterialsRouteLayout: () => null })
)
vi.mock('@/features/authz/guards/ensure-authenticated-route-session', () => ({
  ensureAuthenticatedRouteSession: vi.fn(),
}))
vi.mock('./services/material-core-service', () => ({
  MaterialCoreService: {
    getMaterialOptions: vi.fn(async () => []),
    getMaterials: vi.fn(async () => ({ data: [], total: 0 })),
  },
}))

const invokeProductionMaterialParentRouteLoader = Route.options
  .loader as unknown as (args: {
  location: { pathname: string }
  context: { queryClient: { ensureQueryData: ReturnType<typeof vi.fn> } }
}) => Promise<null>

describe('production material handbook parent route loading', () => {
  it('does not prefetch material options or records when opening the standalone guide', async () => {
    const ensureQueryData = vi.fn()
    for (const pathname of [
      PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH,
      `${PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH}/`,
    ]) {
      await invokeProductionMaterialParentRouteLoader({
        location: { pathname },
        context: { queryClient: { ensureQueryData } },
      })
    }
    expect(ensureQueryData).not.toHaveBeenCalled()
    expect(MaterialCoreService.getMaterialOptions).not.toHaveBeenCalled()
    expect(MaterialCoreService.getMaterials).not.toHaveBeenCalled()
  })

  it('keeps the existing business prefetch for material and conversion pages', async () => {
    for (const pathname of [
      '/materials/all',
      '/materials/RAW_MATERIAL',
      '/materials/assembly',
    ]) {
      const ensureQueryData = vi.fn(
        async ({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn()
      )
      await invokeProductionMaterialParentRouteLoader({
        location: { pathname },
        context: { queryClient: { ensureQueryData } },
      })
      expect(ensureQueryData).toHaveBeenCalledTimes(2)
    }
    expect(MaterialCoreService.getMaterialOptions).toHaveBeenCalledTimes(3)
    expect(MaterialCoreService.getMaterials).toHaveBeenCalledWith(
      'all',
      1,
      20,
      ''
    )
  })
})
