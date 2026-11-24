import type { UseQueryOptions } from '@tanstack/react-query'
import { productionLinesService } from '../services/production-lines-service'
import { productionProcessesService } from '../services/production-processes-service'
import { productionRoutesService } from '../services/production-routes-service'
import type {
  ProductionLineBOMBranch,
  ProductionLine,
  ProductionLineProductTemplate,
} from './production-line'
import type { ProductionProcessStep } from './production-process'
import { productionResourceQueryKeys } from './production-resource-query-keys'
import type { ProductionRoute } from './production-route'

export const productionResourceQueryOptions = {
  lineBOMBranches: (): UseQueryOptions<ProductionLineBOMBranch[], Error> => ({
    queryKey: productionResourceQueryKeys.lineBOMBranches(),
    queryFn: () => productionLinesService.getBOMBranches(),
  }),

  lineProductTemplates: (): UseQueryOptions<
    ProductionLineProductTemplate[],
    Error
  > => ({
    queryKey: productionResourceQueryKeys.lineProductTemplates(),
    queryFn: () => productionLinesService.getProductTemplates(),
  }),

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
