import type { UseQueryOptions } from '@tanstack/react-query'
import { productionLinesService } from '../services/production-lines-service'
import { productionProcessesService } from '../services/production-processes-service'
import { productionRoutesService } from '../services/production-routes-service'
import type { ProductionLine } from './production-line'
import type { ProductionProcessStep } from './production-process'
import type { ProductionRoute } from './production-route'
import { productionResourceQueryKeys } from './production-resource-query-keys'

export const productionResourceQueryOptions = {
  lines: (): UseQueryOptions<ProductionLine[], Error> => ({
    queryKey: productionResourceQueryKeys.lines(),
    queryFn: () => productionLinesService.getLines(),
  }),

  processes: (): UseQueryOptions<ProductionProcessStep[], Error> => ({
    queryKey: productionResourceQueryKeys.processes(),
    queryFn: () => productionProcessesService.getSteps(),
  }),

  routes: (): UseQueryOptions<ProductionRoute[], Error> => ({
    queryKey: productionResourceQueryKeys.routes(),
    queryFn: () => productionRoutesService.getRoutes(),
  }),
} as const
