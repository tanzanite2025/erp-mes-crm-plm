import { createFileRoute } from '@tanstack/react-router'
import { parseBusinessRecordSearchRouteParameters } from '@/hooks/use-business-record-search-keyword'
import { ensureAuthenticatedRouteSession } from '@/features/authz/guards/ensure-authenticated-route-session'
import { MaterialsRouteLayout } from '@/features/material-archive/components/materials-route-layout'
import { PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH } from '@/features/material-archive/production-material-creation-operation-guide-tab-config'
import {
  getMaterialListQueryKey,
  MATERIAL_OPTIONS_QUERY_KEY,
} from '@/features/material-archive/query-keys'
import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'

export const Route = createFileRoute('/_authenticated/materials')({
  validateSearch: parseBusinessRecordSearchRouteParameters,
  beforeLoad: async ({ location }) => {
    await ensureAuthenticatedRouteSession(location.pathname)
  },
  loader: async ({ context, location }) => {
    if (
      location.pathname.replace(/\/$/, '') ===
      PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH
    )
      return null

    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: MATERIAL_OPTIONS_QUERY_KEY,
        queryFn: () => MaterialCoreService.getMaterialOptions(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: getMaterialListQueryKey('all', 0, 20, ''),
        queryFn: () => MaterialCoreService.getMaterials('all', 1, 20, ''),
      }),
    ])

    return null
  },
  component: MaterialsRouteLayout,
})
